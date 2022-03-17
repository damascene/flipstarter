const libauth = require("@bitauth/libauth");
const createQrCode = require("./src/qrcode.js");

window.libauth = libauth;

class Wallet {
    static async create() {
        const crypto = await libauth.instantiateBIP32Crypto();

        return new Wallet(crypto);
    }

    static fromHexString(hexString) {
        return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    }

    static toHexString(bytes) {
        return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    }


    #_crypto = null;
    #_privateKey = null;

    constructor(crypto) {
        this._crypto = crypto;

        this._privateKey = libauth.generatePrivateKey(function() {
            return window.crypto.getRandomValues(new Uint8Array(32))
        });

        // TODO: Hardcoded private key for debugging... DO NOT USE
        this._privateKey = Wallet.fromHexString("A7A117BE6E294242C997B34F0EC8F41EC9F104B445712B1AA41C0D38C204C879");
    }

    getAddress() {
        const publicKey = this._crypto.secp256k1.derivePublicKeyCompressed(this._privateKey);
        const hash = this._crypto.ripemd160.hash(this._crypto.sha256.hash(publicKey));
        return libauth.encodeCashAddress(libauth.CashAddressNetworkPrefix.mainnet, libauth.CashAddressVersionByte.P2PKH, hash);
    }

    createQrCode(widthPx) {
        const width = widthPx || 82;
        const address = this.getAddress();

        const qr = createQrCode(4, "M");
        qr.addData(address);
        qr.make();
        const html = qr.createImgTag();

        const divElement = document.createElement("div");
        divElement.innerHTML = html;
        const imgElement = divElement.firstElementChild;

        imgElement.setAttribute("width", width);
        imgElement.setAttribute("height", width);

        return imgElement;
    }
}

window.Wallet = Wallet;

window.setTimeout(async function() {
    const wallet = await Wallet.create();
    const address = wallet.getAddress();

    const subscribeAddress = function() {
        window.webSocket.send(JSON.stringify({
            address: address
        }));
    };

    if (window.webSocket.readyState == WebSocket.OPEN) {
        subscribeAddress();
    }
    else {
        window.webSocket.onopen = subscribeAddress;
    }

    window.Wallet.instance = wallet;
}, 0);
