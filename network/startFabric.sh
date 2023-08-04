#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error
set -x

# launch network; create channel and join peer to channel
pushd ~/fabric-samples/test-network
./network.sh down
./network.sh up createChannel -ca 
#./network.sh deployCC -ccn starinstar -ccv 1  -ccl go -ccp ~/dev/star-project/contract/starinstar
popd