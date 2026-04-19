//hash 
//key : hash 이름 하나에 대해 field + value 여럿 가능

// listpack : Redis 7.0 이전에는 ziplist
// 1. hash 필드 개수 : hash-max-listpack-entries 보다 작거나 같음 (512)
// 2. 모든 필드 이름과 값의 크기가 hash-max-listpack-value (64)

// 둘 중 하나를 위반시 hashtable의 활용 
//string vs hash table 
// string으로 저장시는 메타데이터를 포함하는 헤더를 함께 저장해야하므로 hash table이 더 메모리 효율상 더 적합  
// "user:1000:name", "user:1000:email", "user:1000:age"
// "user:1000"


/*
    HSET O(1) : HSET key field value 
        HSET user:1000 name alice
        
        HSET user:1000 name Alice email alice@example.com age 25

    HGET O(1): HGET key field
        HGET user:1000 name
        

    다중 조회, 설정 명령
    다중으로 한꺼번에 조회 시 매번 조회함으로 인한 네트워크에 대한 연결 및 전송 비용을 줄일 수 있음
    HMSET(deprecated)
    set을 통해 가능하기 대문에 굳이 mset을 쓸 필요 없음
    여러 필드 설정 시 원자성이 중요하고 이를 레디스가 지원(단일 스레드)

    HMGET: HMGET key field
        key : hash 이름, field : 필드 이름들
        배열 반환
        다중 
        ex) HMGET user:1000 name email age 
        

    HINCRBY : HINCRBY key field increment
        HINCRBY user:1000 age 1
    
    HEXISTS : HEXISTS key field
    field의 존재 유무

    HKEYS : key에 대한 모든 필드를 반환
    HKEYS key

    HVALS : key에 대한 모든 value를 반환
    HVALS key 
*/

import { createRedisClient, disconnectRedisClient } from "../connection";

async function main() {
    const client = createRedisClient(); //const : 불변객체 (참조 주소를 바꾸지 않음, state 변경 가능)

    try { 
        await client.hset('user:1000', 'email', 'alice@example.com', 'age', '25')

        const name = await client.hget('user:1000', 'name');
        console.log('Name:', name); 

        const [name2, email, age2] = await client.hmget('user:1000', 'name', 'email', 'age');
        console.log('HMGET:', name2, email, age2);

        const allField = await client.hgetall('user:1000');
        console.log('HGETALL:', allField);

        for (const [f, v] of Object.entries(allField)) {
            console.log(`Field: ${f}, Value: ${v}`);
        }

        const hasPhone = await client.hexists('user:1000', 'phone');
        console.log('Has phone field:', hasPhone); // 0

        const keys = await client.hkeys('user:1000'); //key
        console.log('HKEYS:', keys); //fields

        const vals = await client.hvals('user:1000');
        console.log('HVALS:', vals); //values 

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await disconnectRedisClient(client);
    }
}

main();