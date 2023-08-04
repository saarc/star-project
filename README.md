# star-project

# 선행조건
linux20.04LTS server
docker, docker-compose
nodejs v18, go 1.20.x
fabric 설치, 설정

# 0. code clone
```
# ~/dev 디렉토리에서 작업한다고 가정
git clone https://github.com/saarc/star-project
```
# 2. 네트워크 시작
```
# cd ~/dev/star-project/network
./startFabric.sh
```
# 3. connection-org1.json 연결정보 복사
```
cd ~/dev/star-project/application
cp ~/fabric-samples/test-network/organizations/peerOrganizations/org1example.com/connection-org1.json ./config
```
# 4. server 시작
```
node server.js
```
  
# 5. 크롬에 접속
  localhost:3000
( 관리자인증서 생성 -> 유저인증서 생성 -> 기능 테스트)
