/*
SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/golang/protobuf/ptypes"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing a car
type SmartContract struct {
	contractapi.Contract
}

type StarCard struct {
	PNO   	string 	`json:"phoneno"`
	Mileage int 	`json:"mileage"`
	Star 	int 	`json:"star"`
}

type HistoryQueryResult struct {
	Record    *StarCard    `json:"record"`
	TxId     string    `json:"txId"`
	Timestamp time.Time `json:"timestamp"`
	IsDelete  bool      `json:"isDelete"`
}

func (s *SmartContract) RegisterStarCard(ctx contractapi.TransactionContextInterface, phoneno string, mileage int) error {

	// (TO DO) 기준 starcard id 중복검증
	sc, _	:= s.QueryStarCard(ctx, phoneno)
	
	if sc != nil {
		return fmt.Errorf("Phone Number has registered already: %s", phoneno)
	}

	starcard := StarCard{PNO:phoneno, Mileage:mileage}

	cardAsBytes, _ := json.Marshal(starcard)

	return ctx.GetStub().PutState(phoneno, cardAsBytes)
}

func (s *SmartContract) UpdateMileage(ctx contractapi.TransactionContextInterface, phoneno string, amount int) error {
	sc, err := s.QueryStarCard(ctx, phoneno)

	if err != nil {
		return err
	}
	if amount == 0 {
		return fmt.Errorf("Amount is 0: %s", phoneno)
	} else if amount < 0 {
		if (sc.Mileage + amount) >= 0 {
			sc.Mileage += amount
			sc.Star += 1
		} else {
			return fmt.Errorf("Mileage is not enough: %s", phoneno)
		}
	} else {
		sc.Mileage += amount
	}

	cardAsBytes, _ := json.Marshal(sc)

	return ctx.GetStub().PutState(phoneno, cardAsBytes)
}

func (s *SmartContract) SpendStar(ctx contractapi.TransactionContextInterface, phoneno string) error {
	sc, err := s.QueryStarCard(ctx, phoneno)

	if err != nil {
		return err
	}
	if sc.Star <= 0 {
		return fmt.Errorf("Star number is not enoght: %s", phoneno)
	}

	sc.Star -= 1

	cardAsBytes, _ := json.Marshal(sc)

	return ctx.GetStub().PutState(phoneno, cardAsBytes)
}

func (s *SmartContract) TransferStar(ctx contractapi.TransactionContextInterface, from string, to string, amount int) error {
	
	// StarCard 읽어오기
	scfrom, err := s.QueryStarCard(ctx, from)
	if err != nil {
		return err
	}

	scto, err := s.QueryStarCard(ctx, to)
	if err != nil {
		return err
	}

	// StarCard 전송자 별개수 검증
	if scfrom.Star-amount < 0 {
		return fmt.Errorf("Star number is not enoght: %s", from)
	}

	// Transfer 구현
	scfrom.Star -= amount
	scto.Star += amount

	fromcardAsBytes, _ := json.Marshal(scfrom)
	tocardAsBytes, _ := json.Marshal(scto)

	return ctx.GetStub().PutState(from, fromcardAsBytes)
	return ctx.GetStub().PutState(to, tocardAsBytes)
}

func (s *SmartContract) QueryStarCard(ctx contractapi.TransactionContextInterface, phoneno string) (*StarCard, error) {
	cardAsBytes, err := ctx.GetStub().GetState(phoneno)

	if err != nil {
		return nil, fmt.Errorf("Failed to read from world state. %s", err.Error())
	}

	if cardAsBytes == nil {
		return nil, fmt.Errorf("%s does not exist", phoneno)
	}

	starcard := new(StarCard)
	_ = json.Unmarshal(cardAsBytes, starcard)

	return starcard, nil
}

func (t *SmartContract) History(ctx contractapi.TransactionContextInterface, phoneno string) ([]HistoryQueryResult, error) {
	log.Printf("History: ID %v", phoneno)

	resultsIterator, err := ctx.GetStub().GetHistoryForKey(phoneno)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []HistoryQueryResult
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var asset StarCard
		if len(response.Value) > 0 {
			err = json.Unmarshal(response.Value, &asset)
			if err != nil {
				return nil, err
			}
		} else {
			asset = StarCard{
				PNO: phoneno,
			}
		}

		timestamp, err := ptypes.Timestamp(response.Timestamp)
		if err != nil {
			return nil, err
		}

		record := HistoryQueryResult{
			TxId:      response.TxId,
			Timestamp: timestamp,
			Record:    &asset,
			IsDelete:  response.IsDelete,
		}
		records = append(records, record)
	}

	return records, nil
}

func main() {

	chaincode, err := contractapi.NewChaincode(new(SmartContract))

	if err != nil {
		fmt.Printf("Error create starinstar chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting starinstar chaincode: %s", err.Error())
	}
}