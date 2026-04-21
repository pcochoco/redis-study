// listpack

// skiplist + hashtable
// skiplist : 여러 레벨의 포인터를 유지해 빠른 검색 지원 O(log n)
// 메모리 자체는 더 많이 사용하지만(member, score, level pointers) 다양한 작업을 효율적으로 지원

// score 기반의 data 조회 : skiplist
// member 기반의 조회 : hash table


/*
    ZADD에 대한 옵션
    1. NX : 멤버가 존재하지 않을 때
    ZADD leaderboard NX 100 Alice (SETNX)

    2. XX : 멤버가 존재하는 경우에만 
    ZADD leaderboard XX 150 Bob (SETXX)

    3. GT : 새 스코어가 기존 스코어보다 큰 경우만
    ZADD leaderboard GT 200 Charlie (SETGT)

    4. LT : 새 스코어가 기존 스코어보다 작은 경우만
    ZADD leaderboard LT 50 Dave (SETLT)

    5. CH : ZADD의 반환값은 새로 추가된 요소 개수 
    반환 시 score가 변경된 요소도 포함

    6. INCR : ZINCRBY -> ZADD leaderboard INCR 20 Alice

    범위 조회 
    1. ZRANGE : start end index, with scores (점수는 문자열로 반환)
    ZRANGE leaderboard 0 -1 WITHSCORES (마지막 요소 == 최고 점수)

    2. ZREVRANGE : ZRANGE 의 반대(둘 중 하나만 사용해도 됨)
    ZREVRANGE leaderboard 0 -1 WITHSCORES

    순위 계산 (with score option 가능 - redis 7.2 이상부터)
    1. ZRANK : 특정 키, 멤버의 순위 계산
    ZRANK leaderboard Alice

    2. ZREVRANK : ZREVRANK leaderboard Alice


    zincrby key increment member

    zrem key member
*/

import { createRedisClient, disconnectRedisClient } from "../connection";

async function main() {
    const client = createRedisClient();

    try {
        await client.zadd('leaderboard', 100, 'Alice') //score, member

        //zadd
        // 점수 옵션 기반 전체 조회 : 낮~높(-1 : 마지막 원소까지)
        const all = await client.zrange('leaderboard', 0, -1, 'WITHSCORES');
        console.log('ZRANGE:', all);

        // NX : 존재하지 않을 때 추가
        const nxResult = await client.zadd('leaderboard', 'NX', 200, 'Eve');
        console.log('ZADD NX Results:', nxResult); // 1 

        // XX : 존재할 때만 추가
        const xxResult = await client.zadd('leaderboard', 'XX', 150, 'Alice');
        console.log('ZADD XX Results:', xxResult); // 0 
        // 새로운 멤버가 추가 -> 1
        // 기존 멤버 점수가 변경, 아무 변화가 없다 -> 0

        // GT : 새 점수가 기존보다 클때만 업데이트
        const aliceScore1 = await client.zscore('leaderboard', 'Alice'); //점수 가져오기

        const aliceScore2 = await client.zadd('leaderboard', 'gt', 180, 'Alice'); //zadd : greater than 인 경우만 점수를 업데이트

        console.log('Alice Scores (GT):', aliceScore1, aliceScore2); 


        // zrange : 범위 조회
        const bottom3 = await client.zrange('leaderboard', 0, 2, 'WITHSCORES'); // 낮은 점수부터 조회(2까지 포함)
        console.log('Bottom 3 ZRANGE:', bottom3);

        const top3 = await client.zrevrange('leaderboard', 0, 2, 'WITHSCORES'); // 높은 점수부터 조회
        console.log('Top 3 ZREVRANGE:', top3);

        // 6.2+ ZRANGE로 REV 적용
        const top3_v62 = await client.zrange('leaderboard', 0, 2, 'REV', 'WITHSCORES');
        console.log('Top 3 ZRANGE v6.2+:', top3_v62);


        // zrank : 순위 조회
        // 낮은 점수 기준 순위 (0부터 시작)
        const rankAsc = await client.zrank('leaderboard', 'Alice');
        console.log('Alice Rank (Asc):', rankAsc);

        // zrevrank : 높은 점수 기준 순위 (0부터 시작)
        const rankDesc = await client.zrevrank('leaderboard', 'Alice');
        console.log('Alice Rank (Desc):', rankDesc);

        // zincrby : 점수 증가
        const newScore = await client.zincrby('leaderboard', 30, 'Bob');
        console.log('Bob New Score after ZINCRBY 30:', newScore);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await disconnectRedisClient(client);
    }
}

main();