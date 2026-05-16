// @ts-check

/** @typedef {import('./types.js').AssetsMap} AssetsMap */
/** @typedef {import('./types.js').ConfigObject} ConfigObject */
/** @typedef {import('./types.js').InputTransformCallback} InputTransformCallback */
/** @typedef {import('./types.js').ParamsObject} ParamsObject */
/** @typedef {import('./types.js').AppWindow} AppWindow */
/** @typedef {ConfigObject & { iconPath?: string, dlcs?: Array<string|number|DLC>, locaText?: Record<string, string>, icon?: string, available?: unknown, dlcLockingObservables?: Array<KnockoutObservable<unknown>>, name?: string|(() => string) }} NamedElementConfig */
/** @typedef {{ obs: KnockoutObservable<number|string>, id: string|number }} NumberInputParams */
/** @typedef {{ max?: number, min?: number, step?: number, length?: number, on: (event: string, handler: (evt: unknown) => void) => void, get: (index: number) => unknown, attr: (name: string) => string|undefined }} NumberInputElement */
/** @typedef {{ precision?: number, min?: number, max?: number, callback?: InputTransformCallback }} NumericBounds */

var ko = require( "knockout" );

const appWindow = /** @type {AppWindow} */ (/** @type {unknown} */ (window));
const view = appWindow.view;
const params = /** @type {AppWindow['params'] & { icons?: Record<string, string>, dlcs?: Record<string, DLC> }} */ (appWindow.params);
const globalObject = /** @type {{ $?: any }} */ (/** @type {unknown} */ (globalThis));
const $ = /** @type {any} */ (globalObject.$);

export let versionCalculator = "v11.1";
export let isPreview = false;
export let ACCURACY = 0.01;
export let EPSILON = 0.0000001;
export let ALL_ISLANDS = "All Islands";

/**
 * @param {AssetsMap} assetsMap
 */
export function setDefaultFixedFactories(assetsMap) {
    // Default rum, cotton fabric and coffee to the new world production
    /** @type {any} */ (assetsMap.get(1010240)).fixedFactory(assetsMap.get(1010318));
    /** @type {any} */ (assetsMap.get(1010257)).fixedFactory(assetsMap.get(1010340));
    /** @type {any} */ (assetsMap.get(120032)).fixedFactory(assetsMap.get(101252));
    /** @type {any} */ (assetsMap.get(1010216)).fixedFactory(assetsMap.get(1010294));
    /** @type {any} */ (assetsMap.get(1010214)).fixedFactory(assetsMap.get(1010292));
    /** @type {any} */ (assetsMap.get(1010206)).fixedFactory(assetsMap.get(1010284));
}

/**
 * @param {string|(() => string)} string
 */
function removeSpaces(string) {
    if (typeof string === "function")
        string = string();
    return string.replace(/\W/g, "");
}

var formater = new Intl.NumberFormat(navigator.language || "en").format;
/**
 * @param {number|string} num
 * @param {boolean} forceSign
 */
export function formatNumber(num, forceSign = false) {
    var rounded = Math.ceil(100 * parseFloat(String(num))) / 100;
    if (Math.abs(rounded) < EPSILON)
        rounded = 0;
    var str = formater(rounded);
    if (forceSign && rounded > EPSILON)
        str = '+' + str;
    return str;
}

export class NumberInputHandler {
    /**
     * @param {NumberInputParams} params
     */
    constructor(params) {
        this.obs = params.obs;
        this.id = params.id;
        this.input = /** @type {any} */ ($('#' + this.id));
        this.max = parseFloat(this.input.attr('max') || String(Infinity));
        this.min = parseFloat(this.input.attr('min') || String(-Infinity));
        this.step = parseFloat(this.input.attr('step') || '1');
        if (this.input.length != 1)
            console.log("Invalid binding", this.id, this.input);
        this.input.on("wheel", /** @type {(evt: any) => void} */ ((evt) => {
            if (document.activeElement !== this.input.get(0))
                return;

            evt.preventDefault();
            var deltaY = evt.deltaY || (evt.originalEvent || {}).deltaY || 0;
            var sign = -Math.sign(deltaY);
            var factor = this.getInputFactor(evt);

            var val = parseFloat(String(this.obs())) + sign * factor * this.step + ACCURACY;
            val = Math.max(this.min, Math.min(this.max, val));
            this.obs(Math.floor(val / this.step) * this.step);

            return false;
        }));
    }

    /**
        * @param {{ ctrlKey?: boolean, shiftKey?: boolean }} evt
     */
    getInputFactor(evt) {
        var factor = 1
        if (evt.ctrlKey)
            factor *= 10
        if (evt.shiftKey)
            factor *= 100
        return factor
    }
}

/**
 * @param {number|string} number
 * @param {boolean} forceSign
 */
export function formatPercentage(number, forceSign = true) {
    return appWindow.formatNumber(Math.ceil(10 * parseFloat(String(number))) / 10, forceSign) + ' %';
}

/**
 * @template T
 * @param {KnockoutObservable<T>} obs
 * @param {T} val
 */
export function delayUpdate(obs, val) {
    const typedObs = /** @type {any} */ (obs);
    var version = typedObs.getVersion ? typedObs.getVersion() : typedObs();
    setTimeout(() => {
        if (typedObs.getVersion && !typedObs.hasChanged(version) || version === typedObs())
            typedObs(val);
    });
}

// from https://knockoutjs.com/documentation/extenders.html
/** @type {(target: KnockoutObservable<number|string>, bounds: NumericBounds) => KnockoutComputed<number|string>} */
const numericExtender = function (target, bounds) {
    //create a writable computed observable to intercept writes to our observable
    var result = ko.computed({
        read: target,  //always return the original observables value
        /**
         * @param {string|number} newValue
         */
        write: function (newValue) {
            var current = target();
            const max = bounds.max ?? Infinity;
            const min = bounds.min ?? -Infinity;

            if (bounds.precision === 0)
                var valueToWrite = parseInt(String(newValue));
            else if (bounds.precision) {
                var roundingMultiplier = Math.pow(10, bounds.precision);
                var newValueAsNum = isNaN(Number(newValue)) ? 0 : Number(newValue);
                var valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;
            } else {
                var valueToWrite = parseFloat(String(newValue));
            }

            if (!isFinite(valueToWrite) || valueToWrite == null) {
                if (newValue != current)
                    target.notifySubscribers(); // reset input field

                return;
            }

            if (valueToWrite > max)
                valueToWrite = max;

            if (valueToWrite < min)
                valueToWrite = min;

            if (bounds.callback && typeof bounds.callback === "function") {
                const callbackValue = bounds.callback(Number(valueToWrite), Number(current), newValue);
                if (callbackValue == null)
                    return;

                valueToWrite = callbackValue;
                if (valueToWrite == null)
                    return;
            }

            //only write if it changed
            if (valueToWrite !== current || newValue !== valueToWrite) {
                const resultState = /** @type {any} */ (result);
                if (resultState._state && resultState._state.isBeingEvaluated) {
                    console.log("cycle detected, propagation stops");
                    return;
                }

                target(valueToWrite);
                if (newValue !== valueToWrite)
                    /** @type {any} */ (target).valueHasMutated();
            }
        }
    }).extend({ notify: 'always' });

    //initialize with current value to make sure it is rounded appropriately
    result(target());

    //return the new computed observable
    return result;
};

/** @type {any} */ (ko.extenders).numeric = numericExtender;

/**
 * @param {number} init
 * @param {number} min
 * @param {number} max
 * @param {InputTransformCallback|null} callback
 */
export function createIntInput(init, min = -Infinity, max = Infinity, callback = null) {
    return ko.observable(init).extend({
        numeric: {
            precision: 0,
            min: min,
            max: max,
            callback: callback
        }
    });
}

/**
 * @param {number} init
 * @param {number} min
 * @param {number} max
 * @param {InputTransformCallback|null} callback
 */
export function createFloatInput(init, min = -Infinity, max = Infinity, callback = null) {
    return ko.observable(init).extend({
        numeric: {
            min: min,
            max: max,
            precision: 6,
            callback: callback
        }
    });
}

export class NamedElement {
    /**
     * @param {NamedElementConfig} config
     */
    constructor(config) {
        $.extend(this, config);
        const namedElement = /** @type {NamedElementConfig & { locaText: Record<string, string>, dlcs?: Array<string|number> | Array<DLC>, iconPath?: string, icon?: string, available?: unknown, dlcLockingObservables?: Array<KnockoutObservable<unknown>> }} */ (this);
        namedElement.locaText = /** @type {Record<string, string>} */ (namedElement.locaText || {});
        this.name = ko.computed(() => {

            let text = namedElement.locaText[view.settings.language()];
            if (text)
                return text;

            text = namedElement.locaText["english"];
            return text ? text : config.name;
        });

        if (namedElement.iconPath && params && params.icons)
            namedElement.icon = params.icons[namedElement.iconPath];

        if (namedElement.dlcs && params && params.dlcs) {
            namedElement.dlcLockingObservables = [];
            const dlcs = namedElement.dlcs;
            const resolvedDlcs = /** @type {Array<DLC>} */ (dlcs.map((d) => view.dlcsMap.get(String(d))).filter((d) => d != null));
            namedElement.dlcs = resolvedDlcs;
            this.available = ko.pureComputed(() => {
                for (var d of resolvedDlcs) {
                    if (d.checked())
                        return true;
                }

                return false;
            });
            this.dlcLockingObservables = [];
        } else {
            this.available = ko.pureComputed(() => true)
        }

    }

    /**
     * @param {KnockoutObservable<unknown>} obs
     */
    lockDLCIfSet(obs) {
        const namedElement = /** @type {NamedElementConfig & { dlcs?: Array<DLC>, dlcLockingObservables?: Array<KnockoutObservable<unknown>> }} */ (this);
        const dlcs = /** @type {Array<DLC> | undefined} */ (namedElement.dlcs);
        if (dlcs == null || dlcs.length != 1)
            return;

        if (!namedElement.dlcLockingObservables)
            namedElement.dlcLockingObservables = [];
        namedElement.dlcLockingObservables.push(obs);
        dlcs[0].addDependentObject(obs);
    }

    delete() {
        const namedElement = /** @type {NamedElementConfig & { dlcs?: Array<DLC>, dlcLockingObservables?: Array<KnockoutObservable<unknown>> }} */ (this);
        const dlcs = /** @type {Array<DLC> | undefined} */ (namedElement.dlcs);
        if (dlcs == null || dlcs.length != 1)
            return;

        for (const obs of namedElement.dlcLockingObservables || [])
            dlcs[0].removeDependentObject(obs);
    }
}

export class Option extends NamedElement {
    /**
     * @param {ConfigObject} config
     */
    constructor(config) {
        super(config);
        this.checked = ko.observable(false);
        this.visible = ko.observable(!!config);
    }
}

export class DLC extends Option {
    /**
     * @param {ConfigObject} config
     */
    constructor(config) {
        super(config);

        this.dependentObjects = /** @type {KnockoutObservableArray<KnockoutObservable<unknown>>} */ (/** @type {unknown} */ (ko.observableArray(/** @type {Array<KnockoutObservable<unknown>>} */ ([])).extend({ deferred: true }))); // notify subscribers at most once per 500 ms

        this.used = ko.pureComputed(() => {
            for (const obs of this.dependentObjects())
                if (obs() != 0) // can be int, float or bool -> non-strict comparison
                    return true;

            return false;
        });

        this.used.subscribe(val => {
            if (val)
                this.checked(true);
        })
    }

    /**
     * @param {KnockoutObservable<unknown>} obs
     */
    addDependentObject(obs) {
        this.dependentObjects.push(obs);
    }

    /**
     * @param {KnockoutObservable<unknown>} obs
     */
    removeDependentObject(obs) {
        this.dependentObjects.remove(obs);
    }
}


