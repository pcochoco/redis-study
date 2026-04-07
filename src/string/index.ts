/*
    1. 최대 크기는 512MB
        -> 5억 3천만 글자

    {
        "id": 123456,
        "name": "홍길동",
        "email": "hong@test.com",
        "age": 30,
        "createdAt": "2026-01-01T12:00:00Z"
    } -> 150 바이트 -> 약 3.5백만개
*/

/*
    1. SDS
    -> SET count 123 -> 내부적으로 "123"이 아니라, 정수 123이 저장
    
    - int: Redis 객체 헤더(16바이트) + 정수값(8바이트) = 약 24바이트
    - embstr: Redis 객체와 SDS를 합쳐서 약 20바이트 + 문자열 길이
    - raw: Redis 객체(16바이트) + SDS 헤더(8바이트) + 문자열 길이 + 여유 공간

    --> "hello" (5바이트)
        -> embstr로 저장 : 약 25바이트
        -> raw : 30바이트
    약 5byte의 차이가 key의 증가에 따라 기하급수적으로 증가
    이를 고려해 최적화 가능
*/

/*
    1. SET : "SET users:1000:name 김철수"

    2. INCRBY : "INCRBY users:1000:visits 5"

    3. MSET : "MSET users:1000:name "김철수" users:1000:email "hong@test.com"

    4. MGET : "MGET users:1000:name users:1000:email users:1000:age"

    5. SETEX : "SETEX sessions:abcd1234 3600 "session_data""
*/


import { createRedisClient, disconnectRedisClient } from "../connection";

//비동기 - redis server 응답 올때까지 서버가 대기 x, node.js는 single thread
//spring의 경우 multi thread를 지원하기 때문에 redis 기다리는 thread 이외 다른 요청에 대해 타 thread들이 동작 
async function main() {
    const client = createRedisClient();

    try {

        //redis server 의 set 명령을 호출
        await client.set('user:100:name', '김철수');
        const name = await client.get('user:100:name');
        console.log('Name:', name);

        await client.set('user:100:name', "이영희");
        const updatedName = await client.get('user:100:name');
        console.log('Updated Name:', updatedName);

        const none = await client.get('user:200:name');
        console.log('Non-existing Name:', none);

        await client.incr('page_views'); //1씩 증가
        await client.incr('page_views');
        await client.incr('page_views');

        const pageViews = await client.get('page_views');
        console.log('Page Views:', pageViews);

        await client.incrby('page_views', 10);
        const updatedPageViews = await client.get('page_views');
        console.log('Updated Page Views:', updatedPageViews);

        await client.decrby('page_views', 5);
        const decrementedPageViews = await client.get('page_views');
        console.log('Decremented Page Views:', decrementedPageViews);

        //multi set
        //여러 key, value를 한번에 저장
        //일반 set을 사용하는 경우 매 회 네트워크 전송
        //multi set은 하나의 요청으로 해당 내용 전송, 원자성 보장, ttl x  
        await client.mset(
            'user:101:name', '박민수',
            'user:101:email', 'park@test.com'
        );

        const values = await client.mget('user:101:name', 'user:101:email');
        console.log('MGET Values:', values);

        //ttl 설정 
        await client.set('sessiont:abc', 'abtice', 'EX', 300) // setex 가능 - option 확장에 더 유리하므로 set을 더 씀
        const sessionTtl = await client.ttl('sessiont:abc');
        console.log('Session TTL (seconds):', sessionTtl);

        //setnx : key가 없을 때만 저장 (return이 1 : success, 저장 0 : fail, 이미 key 있음)
        const first = await client.setnx('config:featureX', 'enabled');
        console.log('First SETNX (should be 1):', first);

        const second = await client.setnx('config:featureX', 'disabled');
        console.log('Second SETNX (should be 0):', second);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        //동기 : redis의 응답 전까지 cpu 대기, 타 작업 처리 x
        //await
        //1. redis 요청
        //2. 해당 함수 잠시 멈춤
        //3. 타 작업 실행
        //4. redis 응답 시 돌아옴
        await disconnectRedisClient(client);
    }
}

main(); //선언한 메서드에 대한 실행