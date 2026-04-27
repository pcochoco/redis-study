import { createRedisClient, disconnectRedisClient } from "../connection";

async function main() {
    // -- subcriber : 구독 모드로 전환되면 다른 명령어 사용 불가
    // -- publisher: 메시지 발행

    const subcriber = createRedisClient();
    const publisher = createRedisClient();

    const patternSubscriber = createRedisClient();

    try {
        const channel = 'test:notification'
        let messageReceived = false;
        subcriber.on('message', (channel, message) => { //특정 event 발생 시 동작하는 함수
            console.log(`Message received from channel ${channel}: ${message}`);
            messageReceived = true;
        });

        await subcriber.subscribe(channel); //채널 구독
        console.log(`채널 구독 시작: ${channel}`);

        const message1 = "Hello, Redis Pub/Sub!";
        const receivers1 = await publisher.publish(channel, message1); //channel로 메시지 발행 시 수신자 수
        console.log(`메시지 발행: "${message1}", 수신자 수: ${receivers1}`);

        const message2 = "Another message for subscribers.";
        const receivers2 = await publisher.publish(channel, message2);
        console.log(`메시지 발행: "${message2}", 수신자 수: ${receivers2}`);

        // 메시지가 수신될 시간을 잠시 기다림
        //Promise : 비동기 작업을 관리할 객체
        //await : 비동기 + non blocking (호출되는 함수 바깥에 대해)
        //함수 외부 : js의 엔진은 다른 함수 실행을 이어 함 / 해당 함수 내부 : await 줄이 끝날 때까지 기다림 
        //await 뒤에는 반드시 promise 있음 : new Promise없이도 가능한 경우는 해당 메서드가 이미 Promise를 반환하도록 설계된 경우
        //setTimeout의 경우 해당되지 않음 - await하기 위해 new Promise를 추가한 것 
        await new Promise(resolve => setTimeout(resolve, 1000)); //resolve : 비동기 작업 성공을 알리는 함수, 1000ms(1sec) 이후 resolve를 실행

        // on : event listener, pmessage : event 이름 정의
        //밑의 psubscribe을 바탕으로 publish된 메시지가 발생 시 동작을 정의
        patternSubscriber.on('pmessage', (pattern, channel, message) => { //pattern 에 해당하는 channel에서 message publish 하는 event 발생 시 동작
            console.log(`Pattern message received from pattern ${pattern}, channel ${channel}: ${message}`);
        })

        await patternSubscriber.psubscribe('news:*'); // new:* 이므로 new:로 시작하는 모든 채널을 구독 신청 
        console.log('패턴 구독 시작: news:*');

        //메시지 전송
        await publisher.publish('news:weather', '오늘의 날씨는 맑음입니다.');
        await publisher.publish('news:sports', '오늘의 경기 결과입니다.');
        await publisher.publish('updates:general', '일반 업데이트 메시지입니다.'); // 구독되지 않음

        // 메시지 수신 대기
        await new Promise(resolve => setTimeout(resolve, 1000));

        //구독 해제
        await patternSubscriber.punsubscribe('news:*');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await disconnectRedisClient(subcriber);
        await disconnectRedisClient(publisher);
    }
}

main();