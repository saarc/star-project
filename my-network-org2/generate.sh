#!/bin/bash

export FABRIC_CFG_PATH=${PWD}

rm -rf config organizations
mkdir config organizations



# ca 컨테이너들을 수행
docker-compose -f docker-compose.yaml up -d ca_org1 ca_org2 ca_orderer

sleep 2

# ca에 접속해서 각 identity를 생성
. scripts/registerEnroll.sh

createOrg1
createOrg2
createOrderer

# genesis.block 생성
configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock ./config/genesis.block

# mychannel.tx 생성
configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./config/mychannel.tx -channelID mychannel

# 앵커 트랜젝션 생성
configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./config/Org1MSPAnchor.tx -channelID mychannel -asOrg Org1MSP

configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./config/Org2MSPAnchor.tx -channelID mychannel -asOrg Org2MSP