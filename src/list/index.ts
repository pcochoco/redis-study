// 요소가 적다, 요소의 크기가 작다 : ziplist(메모리에 대한 효율을 최대로 활용해 연속되게 배치)
// 요소가 많다, 요소의 크기가 크다 : linkedlist

// 7.0 버전부터는 quicklist 제공 = ziplist + linkedlist

/*
    1. LPUSH O(1)
        LPUSH key value, LPUSH key value1 value2 ...
        -> value2 value1 의 순서로 저장됨 

    2. RPUSH 
  
    3. LPOP O(1)
        LPOP key
        LPOP key count : count 크기만큼 제거 

    4. RPOP 
        RPOP key
        RPOP key count  

    5. LRANGE O(s + n) -> s 까지 간 뒤 n개의 요소에 대해 
        LRANGE key start stop
        LRANGE myulist 0 -1 : 처음부터 끝까지 모든 요소가 반환

    6. LLEN O(1) -> meta data로 length를 따로 보관
        LLEN key

    7. LINDEX O(n) -> n개의 요소를 이동해야함(연결 리스트를 통해 구현되어있기 때문에 배열처럼 인덱스를 통해 바로 접근 불가)
        LINDEX key index
        -> index가 음수일 경우, 뒤에서부터 셈

    8. 블로킹 버전의 POP
        BLPOP, BRPOP
        List가 비여있을 때 즉시 nil 반환하지 않고 요소 추가될 때까지 대기했다가 제거
        ex) BLPOP queue 0 
        queue에 요소가 있다면 즉시 반환하고 비어있는 경우 무한 대기(0 == 무한대기)
        
        queue1, queue2에 대해 동시에 적용 가능
        ex) BLPOP queue1 queue2 0
*/
import { createRedisClient, disconnectRedisClient } from "../connection";
async function main(){
    const client = createRedisClient();

    try{
        await client.rpush('mylist', 'first');
        await client.rpush('mylist', 'second', 'third');
         
        const list1 = await client.lrange('mylist', 0, -1);

        console.log('list length', list1.length);
        console.log('list elements', list1); //lrange를 통해 얻음

        const firstElement = client.lpop('mylist');
        console.log('first element', firstElement);

        const multiItems = client.lpop('mylist', 2);
        console.log('2 items popped', multiItems);

        //queue 적용 - rpush 추가 + lpop 제거 
        await client.del('task_queue'); //값 있을 수 있으므로
        await client.rpush('task_queueu', 'task1', 'task2');

        const task1 = client.lpop('task_queue');
        console.log('first task', task1);

        //stack 적용 - rpush 추가 + rpop 
        await client.del('task_queue');
        await client.rpush('task_queue', 'task1', 'task2');
        const stack_task1 = client.rpop('task_queueu');
        console.log('first task', stack_task1);

        //blocking pop
        await client.del('async_queue');
        
        //3초 후에 push
        setTimeout(async() => {
            await client.rpush('async_queue', 'async_task1');
            console.log('async task1 added to async queue');

        }, 3000)

        //blpop은 같은 커넥션에 쓰지 않음 - 커넥션을 점유하면서 block해버림
        //client를 통해 blpop을 호출했기 때문에 setTimeout이 작동하지 않는 것
        //이미 커넥션을 blpop이 점유하므로 rpush를 같은 client로 보내지 못하는 것
        //따라서 새로운 client를 생성해 해당 client로 blpop 수행
        const producerClient = createRedisClient();

        const result = await producerClient.blpop('async_queue', 5); ///blocking 대기 5초
        if(result){
            console.log('blpop result', result);
        } else{
            console.log('blpop timed out without receiving any items');
        }

        disconnectRedisClient(producerClient);
    }catch(error){
        console.log('error', error);
    }finally{
        disconnectRedisClient(client);
    }
}