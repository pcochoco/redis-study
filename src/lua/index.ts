import { createRedisClient, disconnectRedisClient } from "../connection";

async function main() {
    const client = createRedisClient();
    try {
        //remove all keys from current db 
        await client.flushdb();

        //eval : lua script 실행 
        //지역변수 key에 keys 의 첫번째 값 저장 - local key를 통한 redis key에 대한 접근
        //재과 관리에 대해 원자적으로 차감하는 script 
        //current 가 없거나 차감하고자 하는 양보다 적다면 -1
        //이외 newStock에 재고 저장
        //get, set을 원자적으로 처리할 수 있는 것 
        const script = `
            local key = KEYS[1]

            local quantity = tonumber(ARGV[1])

            local current = tonumber(redis.call("GET", key))

            if current == nil then
                return -1
            end 

            if current < quantity then
                return -1
            end

            local newStock = current - quantity
            redis.call("SET", key, newStock)

            return newStock
        `;

        await client.set('product:1001:stock', '100'); //keys[0] = product:1001:stock
        console.log('Initial Stock:', await client.get('product:1001:stock'));

        // eval(script, keyCount, ...key, ...args) *script = script 이름 
        const result1 = client.eval(script, 1, 'product:1001:stock', '30');
        console.log('Stock after purchasing 30:', await result1);

        const result2 = client.eval(script, 1, 'product:1001:stock', '50');
        console.log('Attempt to purchase 50:', await result2);

        const result3 = client.eval(script, 1, 'product:1001:stock', '80');
        console.log('Attempt to purchase 80:', await result3);

        console.log('evalsha');

        const sha1 = await client.script('LOAD', script) as string; //load에서 script를 sha 값으로 만들어줌
        //전체 script를 네트워크로 전달해줘야하지만 script load는 script cache에 저장해 해당 주소를 반환
        //스크립트 캐시에 저장된 스크립트의 주소 저장 
        console.log('Loaded Script SHA1:', sha1);

        await client.set('product:1001:stock', '100');

        //스크립트 주소 이용 실행
        const result4 = client.evalsha(sha1, 1, 'product:1001:stock', '40');
        console.log('Stock after purchasing 40 using EVALSHA:', await result4);

    } catch (error) {
        console.error('Error:', error);
    } finally { //disconnect를 항상 추가하므로 main 함수 실행 후 종료됨
        //disconnect 없이는 infra가 적용된 경우 프로세스를 죽이지 않고 살려둠, event에 대한 대기 상태 
        //async : 비동기로 응답을 대기하지 않고 다른 일을 함 과 별개 
        //event : 해당 비동기로 진행하는 작업이 완료되었음을 전달 
        //node js 환경은 event 기반이다, *java에서 jvm에 대응, typescript : 언어, nest js : framework 
        await disconnectRedisClient(client);
    }
}

main();