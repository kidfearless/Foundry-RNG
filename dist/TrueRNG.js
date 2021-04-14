import { Debug } from "./Debug.js";
import { RandomAPI } from "./RandomAPI.js";
import { Ref } from './Types.js';
export class TrueRNG {
    constructor() {
        this.RandomNumbers = [];
        this.RandomGenerator = null;
        this.OriginalRandomFunction = Math.random;
        this.PreRNGEventHandler = null;
        this.PostRNGEventHandler = null;
        this.AwaitingResponse = false;
        this.MaxCachedNumbers = 50;
        this.UpdatePoint = 0.5;
        this.HasAlerted = false;
        this.Enabled = true;
        this.LastRandomNumber = Math.random();
    }
    UpdateAPIKey(key) {
        this.RandomGenerator = new RandomAPI(key);
        this.UpdateRandomNumbers();
    }
    UpdateRandomNumbers() {
        if (!this.Enabled) {
            Debug.WriteLine(`Module Disabled...Returning early`);
            return;
        }
        if (this.AwaitingResponse) {
            Debug.WriteLine(`Already awaiting a response`);
            return;
        }
        this.AwaitingResponse = true;
        this.RandomGenerator.GenerateDecimals({ decimalPlaces: 5, n: this.MaxCachedNumbers })
            .then((response) => {
            Debug.WriteLine(`Got new random numbers`, response);
            this.RandomNumbers = this.RandomNumbers.concat(response.data);
        })
            .catch((reason) => {
            Debug.WriteLine(`Caught exception ${reason}`, reason);
        })
            .finally(() => {
            Debug.WriteLine(`Resetting awaiting response property`);
            this.AwaitingResponse = false;
        });
    }
    GetRandomNumber() {
        if (!this.Enabled) {
            Debug.WriteLine(`TrueRNG disabled, returning original function.`);
            return this.OriginalRandomFunction();
        }
        if (!this.RandomGenerator || !this.RandomGenerator.ApiKey) {
            if (!this.HasAlerted) {
                this.HasAlerted = true;
                let d = new Dialog({
                    title: "WARNING MISSING API KEY",
                    content: "You must set an api key in Module Settings for trueRNG to function.",
                    buttons: {
                        ok: {
                            label: "Ok",
                        }
                    },
                    default: "ok",
                });
                d.render(true);
            }
            Debug.WriteLine(`Bad API Key`);
            return this.OriginalRandomFunction();
        }
        if (!this.RandomNumbers.length) {
            Debug.WriteLine(`No Random Numbers`);
            this.UpdateRandomNumbers();
            return this.OriginalRandomFunction();
        }
        let rngFuncReference = new Ref(this.PopRandomNumber);
        if (this.PreRNGEventHandler) {
            if (this.PreRNGEventHandler(this, rngFuncReference)) {
                rngFuncReference.Reference = this.OriginalRandomFunction;
            }
        }
        Debug.WriteLine(`max: ${this.MaxCachedNumbers} update: ${this.UpdatePoint} val: ${this.RandomNumbers.length / this.MaxCachedNumbers}`);
        if ((this.RandomNumbers.length / this.MaxCachedNumbers) < this.UpdatePoint) {
            Debug.WriteLine(`Limited Random Numbers Available`);
            this.UpdateRandomNumbers();
        }
        Debug.WriteLine(`Success`);
        let randomNumber = rngFuncReference.Reference();
        let randomNumberRef = new Ref(randomNumber);
        if (this.PostRNGEventHandler) {
            this.PostRNGEventHandler(this, randomNumberRef);
        }
        this.LastRandomNumber = randomNumberRef.Reference;
        return this.LastRandomNumber;
    }
    PopRandomNumber() {
        let ms = new Date().getTime();
        let index = ms % this.RandomNumbers.length;
        let rng = this.RandomNumbers[index];
        this.RandomNumbers.splice(index, 1);
        Debug.WriteLine(`Returning ${rng}`, rng, index, ms);
        return rng;
    }
}
var trueRNG = new TrueRNG();
globalThis.TrueRNG = trueRNG;
Hooks.once('init', () => {
    trueRNG.OriginalRandomFunction = CONFIG.Dice.randomUniform;
    CONFIG.Dice.randomUniform = trueRNG.GetRandomNumber;
    let params = {
        name: "Random.org API Key",
        hint: "Put your developer key from https://api.random.org/dashboard here",
        scope: "world",
        config: true,
        type: String,
        default: "",
        onChange: value => {
            Debug.WriteLine(`New API KEY: ${value}`);
            trueRNG.UpdateAPIKey(value);
        }
    };
    game.settings.register("trueRNG", "APIKEY", params);
    params =
        {
            name: "Max Cached Numbers",
            hint: "Number of random numbers to pull in per client. Keep this low if you reload your modules a lot. Keep it high if you tend to roll a lot of dice at once",
            scope: "world",
            config: true,
            type: Number,
            range: {
                min: 10,
                max: 200,
                step: 1
            },
            default: 50,
            onChange: (value) => {
                Debug.WriteLine(`New Max Cached Numbers: ${value}`);
                trueRNG.MaxCachedNumbers = value;
            }
        };
    game.settings.register("trueRNG", "MAXCACHEDNUMBERS", params);
    params =
        {
            name: "Update Point",
            hint: "Grab more values when the number of cached dice rolls goes below this percentage of the max dice number.",
            scope: "world",
            config: true,
            type: Number,
            range: {
                min: 1,
                max: 100,
                step: 1
            },
            default: 50,
            onChange: (value) => {
                Debug.WriteLine(`New Update Point: ${value}`);
                trueRNG.UpdatePoint = parseFloat(updatePoint) * 0.01;
            }
        };
    game.settings.register("trueRNG", "UPDATEPOINT", params);
    params =
        {
            name: "Print Debug Messages",
            hint: "Print debug messages to console",
            scope: "world",
            config: true,
            type: Boolean,
            onChange: (value) => {
                Debug.WriteLine(`New Debug Mode: ${value}`);
            },
            default: true
        };
    game.settings.register("trueRNG", "DEBUG", params);
    params =
        {
            name: "Enabled",
            hint: "Enables/Disables the module",
            scope: "world",
            config: true,
            type: Boolean,
            onchange: (value) => {
                Debug.WriteLine(`New Enabled/Disabled Setting: ${value}`);
                trueRNG.Enabled = value;
            },
            default: true
        };
    game.settings.register("trueRNG", "ENABLED", params);
    let maxCached = game.settings.get("trueRNG", "MAXCACHEDNUMBERS");
    trueRNG.MaxCachedNumbers = parseInt(maxCached);
    let updatePoint = game.settings.get("trueRNG", "UPDATEPOINT");
    trueRNG.UpdatePoint = parseFloat(updatePoint) * 0.01;
    let currentKey = game.settings.get("trueRNG", "APIKEY");
    if (currentKey && currentKey.length) {
        trueRNG.UpdateAPIKey(currentKey);
    }
});
//# sourceMappingURL=TrueRNG.js.map