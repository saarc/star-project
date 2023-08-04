#!/bin/bash

set -x

export FABRIC_CFG_PATH=${PWD}

docker-compose -f docker-compose.yaml up -d orderer.example.com peer0.org1.example.com peer0.org2.example.com

sleep 3

CHANNEL_NAME="mychannel"

# org 1 환경설정
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# 채널 생성
peer channel create -o localhost:7050 -c $CHANNEL_NAME --ordererTLSHostnameOverride orderer.example.com -f ./config/${CHANNEL_NAME}.tx --outputBlock ./config/${CHANNEL_NAME}.block --tls --cafile $ORDERER_CA

sleep 2

# 채널 조인
# org1
peer channel join -b ./config/${CHANNEL_NAME}.block

sleep 2

# org2

export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer channel join -b ./config/${CHANNEL_NAME}.block

sleep 2

# 앵커 업데이트
# org2
peer channel update -f ./config/Org2MSPAnchor.tx -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c mychannel --tls --cafile $ORDERER_CA

sleep 2

# org1

export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer channel update -f ./config/Org1MSPAnchor.tx -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c mychannel --tls --cafile $ORDERER_CA