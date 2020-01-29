const ShorePage = function newShorePage() {
    this.destinationDrpDwn = $('#search_destinations_chosen');
    this.alaskaCruise = element(by.xpath('//*[@class="active-result" and @data-option-array-index="2"]'));
    this.shoreExcrTitle = element(by.xpath('(//*[text()="Shore Excursions"])[2]'));
    this.shoreTable = $('#shorexExplore');
    this.findExcursionBtn = element(by.xpath('//*[text()="FIND EXCURSIONS"]'));
    this.portBtn = element(by.xpath('//*[@title="Port"]'));
    this.resultAlaska1 = element(by.xpath('(//*[text()="Icy Strait Point, Alaska"])[1]'));
    this.resultAlaska2 = element(by.xpath('(//*[text()="Juneau, Alaska"])[1]'));
    this.resultAlaska3 = element(by.xpath('(//*[text()="Ketchikan, Alaska"])[2]'));
    this.resultAlaska4 = element(by.xpath('(//*[text()="Seward, Alaska"])[1]'));
    this.resultAlaska5 = element(by.xpath('(//*[text()="Sitka, Alaska"])[1]'));
    this.resultAlaska6 = element(by.xpath('(//*[text()="Skagway, Alaska"])[3]'));
    this.resultAlaska7 = element(by.xpath('(//*[text()="Victoria, British Columbia"])[1]'));
    this.priceRange2 = $$('.ui-slider-handle.ui-corner-all.ui-state-default').get(1);
    this.priceRange30$ = element(by.xpath('//*[@class="ui-slider-handle ui-corner-all ui-state-default" and @style="left: 1.5%;"]'));
    this.adultPriceRange = element.all(by.xpath('//*[text()="Adult from: "]'));
}
module.exports = new ShorePage();