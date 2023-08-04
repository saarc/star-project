//0. 관련모듈포함
var express = require("express")
var path = require("path")
var fs = require("fs")

// TO DO 1 fabric모듈 포함
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

var app = express()

// TO DO 2 CA 연결 설정
const ccpPath = path.resolve(__dirname, 'config', 'connection-org1.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

//1. body-parser 미들웨어 설정
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//2. static 미들웨어 설정
app.use(express.static(path.join(__dirname, 'views')));

//구현1. / GET 라우팅
app.get('/', (req, res) => {
    res.sendFile(__dirname + "index.html");
});

//구현2. /admin POST 라우팅
app.post('/admin', async (req, res) => {
    const id = req.body.id;
    const pw = req.body.password;

    console.log('/admin post - ', id, pw);

    // TO DO 3 지갑생성 루틴 + 결과 응답
    try {

        // CA 객체 생성과 연결
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // 지갑객체 생성과 기등록 admin 인증서 확인
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // 기등록 admin있으면 
        const identity = await wallet.get(id);
        if (identity) {
            // client에게 결과 전송 - 실패
            console.log('An identity for the admin user admin already exists in the wallet');
            const result_obj = JSON.parse('{"result":"failed", "error":"An identity for the admin user admin already exists in the wallet"}');
            res.send(result_obj);
            return;
        }
        // CA에 관리자 인증서 등록
        const enrollment = await ca.enroll({ enrollmentID: id, enrollmentSecret: pw });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        // 관리자 인증서 저장
        await wallet.put(id, x509Identity);

        console.log('Successfully enrolled admin and imported it into the wallet');
        const res_str = `{"result":"success","msg":"Successfully enrolled ${id} in the wallet"}`
        res.json(JSON.parse(res_str))

    } catch (error) {
        console.log('Failed to enroll admin and imported it into the wallet');
        const res_str = `{"result":"failed","error":"Failed to enroll ${id} in the wallet"}`
        res.json(JSON.parse(res_str))
    }
});

//구현3. /user POST 라우팅
app.post('/user', async (req, res) => {
    const id = req.body.id;
    const role = req.body.role;

    console.log('/user post - ', id, role);

    try {
        // TO DO 4 사용자 인증서 register+enroll
        // CA 객체 생성과 연결
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
        // 지갑객체 생성과 기등록 admin 인증서 확인
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);
        // 기등록 user있으면 
        // Check to see if we've already enrolled the user.
        const userIdentity = await wallet.get(id); // userid
        if (userIdentity) {
            console.log('An identity for the user ' + id + ' already exists in the wallet');
            const result_obj = JSON.parse('{"result":"failed", "error":"An identity for the user already exists in the wallet"}');
            res.send(result_obj);
            return;
        }
        // Check to see if we've already enrolled the admin user.
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('An identity for the admin user "admin" does not exist in the wallet');
            console.log('Run the enrollAdmin.js application before retrying');
            const result_obj = JSON.parse('{"result":"failed", "error":"An identity for the admin does not exist in the wallet"}');
            res.send(result_obj);
            return;
        }
        // CA에 사용자 인증서 등록
        // build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Register the user, enroll the user, and import the new identity into the wallet.
        const secret = await ca.register({
            affiliation: 'org1.department1', // 'org1.department1'
            enrollmentID: id,
            role: role// 'client'
        }, adminUser);
        const enrollment = await ca.enroll({
            enrollmentID: id,
            enrollmentSecret: secret
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put(id, x509Identity);

        console.log(`Successfully enrolled user ${id} and imported it into the wallet`);
        const res_str = `{"result":"success","msg":"Successfully enrolled ${id} in the wallet"}`
        res.json(JSON.parse(res_str))
    } catch (error) {
        console.log(`Failed to enroll user ${id} and imported it into the wallet`);
        const res_str = `{"result":"failed","error":"Failed to enroll ${id} in the wallet"}`
        res.json(JSON.parse(res_str))
    }

});

// TO DO - /starcard register
app.post('/starcard', async (req, res) => {
    const cert = req.body.certid
    const phoneno = req.body.pno
    const mile = req.body.mile

    console.log('/starcard post - ', phoneno, mile, cert);

    try {
        // 인증서 확인
        const walletPath = path.join(process.cwd(),'wallet')
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        const userIdentity = await wallet.get(cert); // userid
        if (!userIdentity) {
            console.log('An identity for the user ' + cert + ' does not exists in the wallet');
            const result_obj = JSON.parse('{"result":"failed", "error":"An identity for the user does not exists in the wallet"}');
            res.send(result_obj);
            return;
        }
        // GW 연결
        const gateway = new Gateway();
        await gateway.connect(ccp, {wallet, identity: cert, discovery: {enabled:true, asLocalhost:true}})
        // CH 연결
        const network = await gateway.getNetwork('mychannel')
        // CC 연결과 호출
        const contract = network.getContract('starinstar')

        await contract.submitTransaction("RegisterStarCard", phoneno, mile)

        console.log(`Successfully created`);
        const res_str = `{"result":"success","msg":"Successfully created"}`
        res.json(JSON.parse(res_str))

    } catch (error) {
        console.log(`Failed to create`);
        const res_str = `{"result":"failed","error":"Failed to create"}`
        res.json(JSON.parse(res_str))
    }

});

// TO DO - /starcard read
app.get('/starcard', async (req, res) => {
    const cert = req.query.certid
    const phoneno = req.query.pno

    console.log('/starcard get - ', phoneno, cert);

    try {
        // 인증서 확인
        const walletPath = path.join(process.cwd(),'wallet')
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        const userIdentity = await wallet.get(cert); // userid
        if (!userIdentity) {
            console.log('An identity for the user ' + cert + ' does not exists in the wallet');
            const result_obj = JSON.parse('{"result":"failed", "error":"An identity for the user does not exists in the wallet"}');
            res.send(result_obj);
            return;
        }
        // GW 연결
        const gateway = new Gateway();
        await gateway.connect(ccp, {wallet, identity: cert, discovery: {enabled:true, asLocalhost:true}})
        // CH 연결
        const network = await gateway.getNetwork('mychannel')
        // CC 연결과 호출
        const contract = network.getContract('starinstar')

        const txresult = await contract.evaluateTransaction("QueryStarCard", phoneno)

        console.log(`Successfully retrieved`);
        const res_str = `{"result":"success","msg":"Successfully retrieved"}`
        let res_data = JSON.parse(res_str)

        res_data.content = JSON.parse(txresult);
        res.json(res_data)
        
    } catch (error) {
        console.log(`Failed to retrieve`, error);
        const res_str = `{"result":"failed","error":"Failed to retrieve"}`
        res.json(JSON.parse(res_str))
    }

});

app.post('/mileage', async (req, res) => {
    const cert = req.body.certid
    const phoneno = req.body.pno
    const amount = req.body.amount

    console.log('/mileage post - ', phoneno, amount, cert);

    try {
        // 인증서 확인
        const walletPath = path.join(process.cwd(),'wallet')
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        const userIdentity = await wallet.get(cert); // userid
        if (!userIdentity) {
            console.log('An identity for the user ' + cert + ' does not exists in the wallet');
            const result_obj = JSON.parse('{"result":"failed", "error":"An identity for the user does not exists in the wallet"}');
            res.send(result_obj);
            return;
        }
        // GW 연결
        const gateway = new Gateway();
        await gateway.connect(ccp, {wallet, identity: cert, discovery: {enabled:true, asLocalhost:true}})
        // CH 연결
        const network = await gateway.getNetwork('mychannel')
        // CC 연결과 호출
        const contract = network.getContract('starinstar')

        await contract.submitTransaction("UpdateMileage", phoneno, amount)

        console.log(`Successfully submitted`);
        const res_str = `{"result":"success","msg":"Successfully submitted"}`
        res.json(JSON.parse(res_str))

    } catch (error) {
        console.log(`Failed to create`);
        console.log(error)
        const res_str = `{"result":"failed","error":"Failed to submit"}`
        res.json(JSON.parse(res_str))
    }

});

app.post('/star', async (req, res) => {
    const cert = req.body.certid
    const phoneno = req.body.pno


    console.log('/star post - ', phoneno, cert);

    try {
        // 인증서 확인
        const walletPath = path.join(process.cwd(),'wallet')
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        const userIdentity = await wallet.get(cert); // userid
        if (!userIdentity) {
            console.log('An identity for the user ' + cert + ' does not exists in the wallet');
            const result_obj = JSON.parse('{"result":"failed", "error":"An identity for the user does not exists in the wallet"}');
            res.send(result_obj);
            return;
        }
        // GW 연결
        const gateway = new Gateway();
        await gateway.connect(ccp, {wallet, identity: cert, discovery: {enabled:true, asLocalhost:true}})
        // CH 연결
        const network = await gateway.getNetwork('mychannel')
        // CC 연결과 호출
        const contract = network.getContract('starinstar')

        await contract.submitTransaction("SpendStar", phoneno)

        console.log(`Successfully submitted`);
        const res_str = `{"result":"success","msg":"Successfully submitted"}`
        res.json(JSON.parse(res_str))

    } catch (error) {
        console.log(`Failed to submit`);
        const res_str = `{"result":"failed","error":"Failed to submit"}`
        res.json(JSON.parse(res_str))
    }
});

app.get('/starcard/history', async(req, res) =>{
    var certid = req.query.certid;
    var pno = req.query.pno;
    console.log("/starcard/history get start -- ", certid, pno);

    const gateway = new Gateway();

    try {
        const walletPath = path.join(process.cwd(),'wallet')
        const wallet = await Wallets.newFileSystemWallet(walletPath);
		// GW -> connect -> CH -> CC -> submitTransaction
        await gateway.connect(ccp, {
            wallet,
            identity: certid,
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed 
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("starinstar");
        var result = await contract.evaluateTransaction('History',pno);
        // result 가 byte array라고 생각하고
        var result = `{"result":"success", "msg":"Successfully retrieved","content":${result}}`;
        console.log("/starcard/history get end -- success", result);

        var obj = JSON.parse(result);
        res.status(200).send(obj);

    } catch (error) {
        var result = `{"result":"failed", "error":"Get history has a error"}`;
        var obj = JSON.parse(result);
        console.log("/starcard/history get end -- failed ", error);
        res.status(200).send(obj);
        return;
    } finally {
        gateway.disconnect();
    }
});

//3. 서버시작
app.listen(3000, () => {
    console.log('Express server stared: 3000');
});