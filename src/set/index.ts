//set : 중복 불가, 순서 없음 

//redis 에서의 set 구현
// intset : 모든 요소 정수, 요소의 개수가 적은 경우 
// -> set-max-intset-entires 으로 config에 설정된 값이 있음 

// hashtable  : 요소가 많거나 정수가 아닌 값이 포함되는 경우

/*
   set 관련 명령어
    1. SADD key member [member ...]
    - O(n) : n 개의 추가에 대해 

    2. SREM key member [member ...]
    - O(n)

    3. SMEMBERS key
    - O(n)
    - 반환 순서 매번 다를 수 있음 
    - redis 원자 연산에 따라 다른 작업 대기될 수 있기 때문에 sscan을 활용(커서 기반으로 데이터 나눠 조회)
    4. SISMEMBER key member -> Redis 6.2 : SMISMEMBER key member [member ...]
      O(1) : hash table을 적용해 조회하기 때문에 

   집합 연산 명령어 
    1. SINTER key [key ...]
       -> set1 [a, b, c], set2 [b, c, d] -> [b, c]

    2. SUNION key [key ...]
       -> set1 [a, b, c], set2 [b, c, d] -> [a, b, c, d]

    3. SDIFF key [key ...]
       -> set1 [a, b, c], set2 [b, c, d] -> [a]
*/

import { createRedisClient, disconnectRedisClient } from "../connection";

async function main(){
   const client = createRedisClient();

   try{
      await client.sadd('fruits', 'apple');
      await client.sadd('fruits', 'apple');
      await client.sadd('fruits', 'lemon');

      const allFruits = await client.smembers('fruits');
      console.log(allFruits);

      const isFruit = await client.sismember('fruits', 'pea');
      console.log('is pea a fruit?', isFruit === 1 ? 'yes' : 'no');

      const size = await client.scard('fruits');
      console.log(size);

      await client.srem('fruits', 'apple');

      const popFruit = await client.spop('fruits');

      await client.sadd('fruits', 'apple', 'lemon');

      const random = await client.srandmember('fruits', 2);
      console.log(random);

      //사용 예시 게시글 좋아요 시스템 

      await client.sadd('post:1:likes', 'u1', 'u2', 'u3'); // 중복되어 user 을 추가해도 set을 활용하면 방지됨

      console.log('total likes for post 1?', await client.scard('post:1:likes'));

      console.log('has user 4 liked post 1?', await client.sismember('post:1:likes', 'u4'));


      

   }catch(error){
      console.log('error', error);
   }finally{
      await disconnectRedisClient(client);
   }

}

main();
