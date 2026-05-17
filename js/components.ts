// @ts-check
import { PopulationNeed } from './consumption.ts';
import { Consumer } from './factories.ts';
import { NumberInputHandler, EPSILON } from './util.ts'

/** @typedef {import('./types.ts').AssetIconModel} AssetIconModel */
/** @typedef {import('./types.ts').ComponentInfo} ComponentInfo */
/** @typedef {import('./types.ts').Demand} Demand */
/** @typedef {import('./types.ts').AppView} AppView */
/** @typedef {import('./types.ts').ExistingBuildingsAsset} ExistingBuildingsAsset */
/** @typedef {import('./types.ts').ParamsObject} ParamsObject */
/** @typedef {import('./types.ts').ResidenceBuilding} ResidenceBuilding */
/** @typedef {import('./types.ts').AppWindow} AppWindow */
/** @typedef {import('./types.ts').WithPropertiesBindingContext} WithPropertiesBindingContext */
/** @typedef {import('./types.ts').WithPropertiesValueAccessor} WithPropertiesValueAccessor */
/** @typedef {{ obs: KnockoutObservable<number|string>, id: string|number }} NumberInputParams */

/** @typedef {{ asset: AssetIconModel }} AssetIconViewModel */
/** @typedef {{ data: unknown, button: unknown }} FactoryHeaderParams */
/** @typedef {{ $data: unknown, hasButton: unknown, $root: AppView }} FactoryHeaderViewModel */
/** @typedef {{ residence: ResidenceBuilding }} ResidenceLabelViewModel */
/** @typedef {{ entries: Array<unknown>, filter: unknown }} ResidenceEffectEntryParams */
/** @typedef {{ entries: Array<unknown>, filter: unknown, texts: AppView['texts'] }} ResidenceEffectEntryViewModel */
/** @typedef {{ old: AssetIconModel, new: AssetIconModel }} ReplacementParams */
/** @typedef {{ old: AssetIconModel, replacing: AssetIconModel }} ReplacementViewModel */
/** @typedef {{ asset: ExistingBuildingsAsset, texts: AppView['texts'] }} ExistingBuildingsInputViewModel */
/** @typedef {{ checked: KnockoutObservable<boolean>, guid: string|number, name: string|(() => string), icon?: string }} IconCheckboxAsset */
/** @typedef {{ asset: IconCheckboxAsset, checked?: KnockoutObservable<boolean>, id?: string|number, title?: string|(() => string) }} IconCheckboxParams */
/** @typedef {{ asset: IconCheckboxAsset, checked: KnockoutObservable<boolean>, id: string|number, title: string|(() => string) }} IconCheckboxViewModel */
/** @typedef {{ amount: unknown }} AdditionalOutputParams */
/** @typedef {{ amount: unknown, texts: AppView['texts'] }} AdditionalOutputViewModel */
/** @typedef {{
 *   id: string|number,
 *   heading: unknown,
 *   collapsed?: boolean,
 *   fieldsetClass?: string,
 *   data?: unknown,
 *   checkbox?: KnockoutObservable<boolean> | Array<{ checked: KnockoutObservable<boolean> }>,
 *   summary?: KnockoutObservable<number>,
 *   colorSummary?: boolean
 * }} CollapsibleParams
 */
/** @typedef {{
 *   target: string,
 *   heading: unknown,
 *   collapser: { id: string, collapsed: KnockoutObservable<boolean> },
 *   cssClass: KnockoutComputed<'hide'|'show'>,
 *   fieldsetClass: string,
 *   data: unknown,
 *   hasCheckbox: boolean,
 *   checked?: KnockoutObservable<boolean> | KnockoutComputed<boolean>,
 *   items?: Array<{ checked: KnockoutObservable<boolean> }>,
 *   hasSummary: boolean,
 *   summary?: KnockoutObservable<number>,
 *   summaryWithSign?: boolean,
 *   summaryClass?: KnockoutObservable<string> | KnockoutComputed<string>
 * }} CollapsibleViewModel
 */
/** @typedef {Demand & { module?: unknown, consumer?: { name: () => string } }} ConsumerEntryDemand */
/** @typedef {{ demand: ConsumerEntryDemand, component: string }} ConsumerEntryViewModel */
/** @typedef {{ factory: { island: { populationLevels: Array<{ guid: string|number }> }, demands: () => Array<ConsumerEntryDemand> } }} ConsumerViewParams */
/** @typedef {{
 *   factory: { island: { populationLevels: Array<{ guid: string|number }> }, demands: () => Array<ConsumerEntryDemand> },
 *   populationLevelIndices: Map<string|number, number>,
 *   demands: KnockoutComputed<Array<ConsumerEntryDemand>>
 * }} ConsumerViewViewModel
 */

var ko = require("knockout");

const appWindow = /** @type {AppWindow} */ (/** @type {unknown} */ (window));
const koComponents = /** @type {any} */ (ko.components); // @copilot why?, please improve if possible
const globalObject = /** @type {{ $?: unknown }} */ (/** @type {unknown} */ (globalThis));
const jq = /** @type {(selector: string) => { on: (events: string, handler: (event: unknown) => void) => void, hasClass: (name: string) => boolean }} */
    (globalObject.$);

ko.bindingHandlers.withProperties = {
    /**
    * @param {Node} element
    * @param {WithPropertiesValueAccessor} valueAccessor
    * @param {unknown} allBindings - Provided by Knockout; shape depends on other active bindings and is not used here.
    * @param {unknown} viewModel - Provided by Knockout; view-model type varies by binding host and is not used here.
    * @param {WithPropertiesBindingContext} bindingContext
     */
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        // Make a modified binding context, with a extra properties, and apply it to descendant elements
        var innerBindingContext = bindingContext.extend(valueAccessor);
        ko.applyBindingsToDescendants(innerBindingContext, element);

        // Also tell KO *not* to bind the descendants itself, otherwise they will be bound twice
        return { controlsDescendantBindings: true };
    }
};

koComponents.register('number-input-increment', {
    viewModel: {
        // - 'params' is an object whose key/value pairs are the parameters
        //   passed from the component binding or custom element
        // - 'componentInfo.element' is the element the component is being
        //   injected into. When createViewModel is called, the template has
        //   already been injected into this element, but isn't yet bound.
        // - 'componentInfo.templateNodes' is an array containing any DOM
        //   nodes that have been supplied to the component. See below.
        /**
         * @param {ParamsObject} params
         * @param {ComponentInfo} componentInfo
         */
         createViewModel: (params, componentInfo) => new NumberInputHandler(/** @type {NumberInputParams} */ (params))
    },
    template:
        `<div class="input-group-btn-vertical" >
                                                        <button class="btn btn-default" type="button" data-bind="click: (_, evt) => {var factor = getInputFactor(evt); var val = parseFloat(obs()) + factor * step + ACCURACY; obs(Math.floor(val/step)*step)}, enable: obs() < max"><i class="fa fa-caret-up"></i></button>
                                                        <button class="btn btn-default" type="button" data-bind="click: (_, evt) => {var factor = getInputFactor(evt); var val = parseFloat(obs()) - factor * step - ACCURACY; obs(Math.ceil(val/step)*step)}, enable: obs() > min"><i class="fa fa-caret-down"></i></button>
                                                    </div>`
});

koComponents.register('notes-section', {
    template:
        `<div class="form-group notes-section" data-bind="if: $data != null && $data.notes != null">
              <textarea class="form-control" data-bind="textInput: $data.notes, attr: {placeholder: $root.texts.notes.name()}"></textarea>
        </div>`
});

koComponents.register('lock-toggle', {
    template:
        `<div style="cursor: pointer" data-bind="click: () => {checked(!checked());}">
             <img class="icon-sm icon-light" src="icons/icon_unlock.png" data-bind="style: {display : checked()? 'none' : 'inherit'}">
             <img class="icon-sm icon-light" src="icons/icon_lock.png" style="display: none;"  data-bind="style: {display : checked()? 'inherit' : 'none'}">
        </div>`
});

koComponents.register('asset-icon', {
    /**
    * @this {AssetIconViewModel}
    * @param {AssetIconModel} asset
     */
    viewModel: function (asset) {
        this.asset = asset;
    },
    template: `<img class="icon-sm" src="" data-bind="attr: { src: asset.icon ? asset.icon : null, alt: asset.name, title: asset.name}">`
});

koComponents.register('factory-header', {
    /**
     * @this {FactoryHeaderViewModel}
     * @param {FactoryHeaderParams} params
     */
    viewModel: function (params) {
        this.$data = params.data;
        this.hasButton = params.button;
        this.$root = appWindow.view;
    },
    template:
        `<div class="ui-fchain-item-tr-button" data-bind="if: hasButton">
            <div>
                <button class="btn btn-light btn-sm" data-bind="click: () => {$root.selectedFactory($data.instance())}" data-toggle="modal" data-target="#factory-config-dialog">
                    <span class="fa fa-sliders"></span>
                </button>
            </div>
        </div>

        <div class="ui-fchain-item-name" data-bind="text: $data.name, visible: !$root.settings.hideNames.checked()"></div>

        <div class="ui-fchain-item-icon mb-2">
            <img class="icon-tile" data-bind="attr: { src: $data.icon ? $data.icon : null, alt: $data.name }">
            <img class="superscript-icon icon-light" data-bind="visible: $data.region, attr: {src: $data.region ? $data.region.icon : null, title: $data.region ? $data.region.name : null}">
        </div>`
})

koComponents.register('residence-label', {
    /**
     * @this {ResidenceLabelViewModel}
     * @param {ResidenceBuilding} residence
     */
    viewModel: function (residence) {
        this.residence = residence;
    },
    template:
        `<div class="inline-list mr-3" data-bind="attr: {title: residence.name}">
            <div data-bind="component: {name: 'asset-icon', params: residence.populationLevel}"></div>
            <div data-bind="component: {name: 'asset-icon', params: residence}"></div>
            <div data-bind="text: residence.floorCount"></div>
        </div>`
})

koComponents.register('residence-effect-entry', {
    /**
     * @this {ResidenceEffectEntryViewModel}
     * @param {ResidenceEffectEntryParams} params
     */
    viewModel: function (params) {
        this.entries = params.entries;
        this.filter = params.filter;
        this.texts = appWindow.view.texts;
    },
    template:
        `<div class="inline-list-centered" data-bind="foreach: entries">
             <div class="inline-list mr-3" data-bind="if: product.available() && ($parent.filter == null || $parent.filter.has(product))">
                <div data-bind="component: { name: 'asset-icon', params: product}" ></div>
                <div data-bind="if: consumptionModifier !== 0">
                    <img class="icon-sm icon-light ml-1" src="icons/icon_marketplace_2d_light.png" data-bind="attr: {title: $parent.texts.reduceConsumption.name}">
                    <span data-bind="text: formatPercentage(consumptionModifier)"></span>
                </div>
                <div data-bind="if: residents !== 0">
                    <img class="icon-sm icon-light ml-1" src="icons/icon_resource_population.png" data-bind="attr: {title: $parent.texts.bonusResidents.name}">
                    <span data-bind="text: '+' + residents"></span>
                </div>
                <div class="inline-list" data-bind="if: suppliedBy.length !== 0">
                    <img class="icon-sm icon-light ml-1" src="icons/icon_transfer_goods_light.png" data-bind="attr: {title: $parent.texts.bonusSupply.name}">
                    <div class="inline-list" data-bind="foreach: {data: suppliedBy, as: 'product'}">
                        <span data-bind="component: {name: 'asset-icon', params: product}"></span>
                    </div>
                </div>
            </div>
        </div>
        `
});

koComponents.register('replacement', {
    /**
     * @this {ReplacementViewModel}
     * @param {ReplacementParams} params
     */
    viewModel: function (params) {
        this.old = params.old;
        this.replacing = params.new;
    }, template:
        ` <div class="ui-fchain-item-icon-replacement">
            <span class="strike-through">
                <img class="icon-sm" src="" data-bind="attr: { src: old.icon ? old.icon : null, alt: old.name }">
            </span>
            <!-- ko if: replacing -->
            <div class="ui-replacement-spacer">
                    &rarr;
            </div>
            <div>
                <img class="icon-sm" src="" data-bind="attr: { src: replacing.icon ? replacing.icon : null, alt: replacing.name }">
            </div>
            <!-- /ko -->
        </div>`
});

koComponents.register('existing-buildings-input', {
    /**
    * @this {ExistingBuildingsInputViewModel}
    * @param {ExistingBuildingsAsset} asset
     */
    viewModel: function (asset) {
        this.asset = asset;
        this.texts = appWindow.view.texts;
    }, template:
        `<div class="input-group input-group-short spinner float-left" style="max-width: 10rem;">
            <div class="input-group-prepend" data-bind="src: {title: texts.residences.name()}">
                <div class="input-group-text">
                    <img class="icon-sm icon-light" src="icons/icon_house_white.png" />
                </div>
            </div>
            <input class="form-control" type="number" value="0" step="1" min="0" data-bind="value: asset.existingBuildings, enable: asset.canEdit == null || asset.canEdit(), attr: {id: asset.guid + '-existing-buildings-input'}" />
            <div class="input-group-append">
                <div data-bind="component: { name: 'number-input-increment', params: { obs: asset.existingBuildings, id: asset.guid + '-existing-buildings-input' }}"></div>
            </div>
        </div>`
});

koComponents.register('icon-checkbox', {
    /**
     * @this {IconCheckboxViewModel}
     * @param {IconCheckboxParams} params
     */
    viewModel: function (params) {
        this.asset = params.asset;
        this.checked = params.checked || this.asset.checked;
        this.id = params.id || this.asset.guid;
        this.title = params.title || this.asset.name
    }, template:
        `<div class="custom-control custom-checkbox">
            <input type="checkbox" class="custom-control-input" data-bind="checked: checked, attr: { 'id': id, 'title': title() }">
            <label class="custom-control-label" data-bind="attr: { for: id }" src-only style="vertical-align: top;">
                <span class="mr-2" style="flex-basis: fit-content;">
                    <img class="icon-sm" src="" data-bind="attr: { src: asset.icon ? asset.icon  : null, alt: title(), for: id }" />
                </span>
            </label>
        </div>`
});

koComponents.register('additional-output', {
    /**
     * @this {AdditionalOutputViewModel}
     * @param {AdditionalOutputParams} params
     */
    viewModel: function (params) {
        this.amount = params.amount;
        this.texts = appWindow.view.texts;
    }, template:
        `<div data-bind="src: { title: texts.extraGoods.name}">
            <img class="icon-sm icon-light mr-2" src="icons/icon_add_goods_socket_white.png"/>
            <span data-bind="text: formatNumber(amount()) + ' t/min'"></span>
        </div>`
});

koComponents.register('collapsible', {
    /**
     * @this {CollapsibleViewModel}
     * @param {CollapsibleParams} params
     */
    viewModel: function (params) {
        this.target = '#' + params.id;
        this.heading = params.heading;
        const collapsibleStates = /** @type {{ get: (id: string, collapsed: boolean) => unknown }} */ (appWindow.view.collapsibleStates);
        this.collapser = /** @type {{id: string, collapsed: KnockoutObservable<boolean>}} */ (collapsibleStates.get(String(params.id), !!params.collapsed));
        this.cssClass = ko.pureComputed(() => this.collapser.collapsed() ? "hide" : "show");
        this.fieldsetClass = params.fieldsetClass ? params.fieldsetClass : "collapsible-section";
        this.data = params.data;
        this.hasCheckbox = false;

        if (params.checkbox) {
            this.hasCheckbox = true;
            if (ko.isWriteableObservable(params.checkbox))
                this.checked = params.checkbox;
            else {
                const items = /** @type {Array<{ checked: KnockoutObservable<boolean> }>} */ (params.checkbox);
                this.items = items;
                this.checked = ko.pureComputed({
                    read: () => {
                        for (var n of items)
                            if (!n.checked())
                                return false;

                        return true;
                    },
                    /**
                     * @param {boolean} checked
                     */
                    write: (checked) => {
                        for (var n of items)
                            n.checked(checked);
                    }
                })
            }
        }

        this.hasSummary = false;
        if (params.summary) {
            const summary = params.summary;
            this.hasSummary = true;
            this.summary = summary;
            if (params.colorSummary) {
                this.summaryWithSign = true;
                this.summaryClass = ko.pureComputed(() => {
                    if (Math.abs(summary()) < EPSILON)
                        return "";

                    return summary() < 0 ? "amount-negative" : "amount-positive"
                })
            } else {
                this.summaryWithSign = false;
                this.summaryClass = ko.observable("");
            }
        }

        setTimeout(() => {
            jq(this.target).on("hidden.bs.collapse shown.bs.collapse", () => {
                this.collapser.collapsed(!jq(this.target).hasClass("show"));
            });
        });

    }, template:
        `<fieldset class="mt-4" data-bind="class: fieldsetClass">
            <legend class="collapser collapsed" data-toggle="collapse" data-bind="attr: {'data-target' : target}, css: {'collapsed' : collapser.collapsed()}">
                <div class="summary" data-bind="if: hasSummary">
                    <span class="float-right" data-bind="class: summaryClass">
                        <span data-bind="text: formatNumber(summary(), summaryWithSign)"></span>
                        <span> t/min</span>
                    </span>
                </div>
                <span class="fa fa-chevron-right"></span>
                <span class="fa fa-chevron-down"></span>
                <!-- ko if: !hasCheckbox -->
                <span data-bind="text:heading"></span>
                <!-- /ko -->
                <!-- ko if: hasCheckbox -->
                <span class="custom-control custom-checkbox ml-1" style="display: initial">
                    <input type="checkbox" class="custom-control-input" data-bind="checked: checked, attr: { id: target + '-check-all' }">
                    <label class="custom-control-label" data-bind="attr: {for: target + '-check-all'}">
                        <span data-bind="text:heading"></span>
                    </label>
                </span>
                <!-- /ko -->
            </legend>
            <div class="collapse" data-bind="attr: {'id' : collapser.id}, class: cssClass">
                <!-- ko template: { nodes: $componentTemplateNodes, data: data } --><!-- /ko -->
                <div class="clear"></div>
            </div>
          </fieldset>
            `
});

koComponents.register('consumer-unknown', {
    template: `<span>?</span>`
});

koComponents.register('consumer-population', {
    template:
        `<div class="inline-list" style="cursor: pointer" data-dismiss="modal" data-bind="click: () => {setTimeout(() => { $root.selectedPopulationLevel($data.level); $('#population-level-config-dialog').modal('show')}, 500);}" >
            <div data-bind="component: {name: 'asset-icon', params: $data.level}"></div>
            <span class="ml-2" data-bind="text: $data.level.name"></span>
        </div>`
});

koComponents.register('consumer-factory', {
    template:
        `<div class="inline-list" style="cursor: pointer" data-bind="click: () => {$root.selectedFactory($data.consumer);}" >
            <div data-bind="component: {name: 'asset-icon', params: $data.consumer}"></div>
            <span class="ml-2" data-bind="text: $data.consumer.getRegionExtendedName()"></span>
        </div>`
});

koComponents.register('consumer-module', {
    template:
        `<div class="inline-list" style="cursor: pointer" data-bind="click: () => {$root.selectedFactory($data.consumer);}" >
            <div data-bind="component: {name: 'asset-icon', params: $data.consumer}"></div>
            <div class="ml-2" data-bind="component: {name: 'asset-icon', params: $data.module}"></div>
            <span class="ml-2" data-bind="text: $data.module.name() + ': ' + $data.consumer.getRegionExtendedName()"></span>
        </div>`
});

koComponents.register('consumer-entry', {
    /**
     * @this {ConsumerEntryViewModel}
     * @param {ConsumerEntryDemand} demand
     */
    viewModel: function (demand) {
        this.demand = demand;

        this.component = "consumer-unknown";

        if (this.demand instanceof PopulationNeed)
            this.component = "consumer-population";
        else if (this.demand.module)
            this.component = "consumer-module";
        else if (this.demand.consumer instanceof Consumer)
            this.component = "consumer-factory";

    }, template:
        `<div data-bind="component: { name: component, params: demand}"></div>`
});

koComponents.register('consumer-view', {
    /**
     * @this {ConsumerViewViewModel}
     * @param {ConsumerViewParams} params
     */
    viewModel: function (params) {
        this.factory = params.factory;
        this.populationLevelIndices = new Map();
        this.factory.island.populationLevels.forEach((/** @type {{guid: number|string}} */ l, /** @type {number} */ i) => this.populationLevelIndices.set(l.guid, i));

        this.demands = ko.pureComputed(() => {
            var demands = this.factory.demands().filter((d) => d.amount() > EPSILON);
            return demands.sort((a, b) => {
                if (a instanceof PopulationNeed && b instanceof PopulationNeed)
                    return Number(this.populationLevelIndices.get((/** @type {any} */ (a)).level.guid) ?? -1)
                        - Number(this.populationLevelIndices.get((/** @type {any} */ (b)).level.guid) ?? -1);

                if (a instanceof PopulationNeed)
                    return -1000;

                if (b instanceof PopulationNeed)
                    return 1000;

                const aDemand = /** @type {Demand & {consumer?: Consumer}} */ (/** @type {unknown} */ (a));
                const bDemand = /** @type {Demand & {consumer?: Consumer}} */ (/** @type {unknown} */ (b));

                if (aDemand.consumer && bDemand.consumer)
                    return String(typeof aDemand.consumer.name === 'function' ? aDemand.consumer.name() : aDemand.consumer.name).localeCompare(String(typeof bDemand.consumer.name === 'function' ? bDemand.consumer.name() : bDemand.consumer.name));

                if (aDemand.consumer)
                    return -1000;

                if (bDemand.consumer)
                    return 1000;

                return b.amount() - a.amount();
            });
        });

    }, template:
        //        `<div data-bind="component: { name: component, params: demand}"></div>`
        `<table class="table table-striped">
            <tbody data-bind="foreach: demands">
                <tr>
                    <td>
                        <div data-bind="component: { name: 'consumer-entry', params: $data}"></div>
                    </td>
                    <td>
                        <div class="float-right">
                            <span data-bind="text: formatNumber($data.amount())"></span>
                            <span> t/min</span>
                        </div>
                    </td>

                </tr>
            </tbody>
         </table>`
});

