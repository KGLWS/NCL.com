require('../Utilities/CustomLocators.js');
const HomePage = require('../Pages/Home.page.js');
const Base = require('../Utilities/Base.js');
const NCLData = require('../TestData/NCLData.json');
const ShoreExcursion = require('../Pages/ShoreExcursion.page.js');

describe('Scenario 2: Guest explores shore excursions destinations', () => {
    beforeAll(function () {
        Base.navigateToHome();
    });

    it('1.Given a GUEST: And I am on Homepage', () => {
        browser.getCurrentUrl().then((homeUrl) => {
            expect(homeUrl).toEqual(NCLData.URLs.homeUrl);
        });
    });

    it('2.And: I navigate to "Shore Excursion" page', () => {
        HomePage.exploreBtn.click();
        browser.sleep(1000).then(() => {
            HomePage.shoreExrBtn.click();
        });
    });

    it('3.When: I search for destination "Alaska Cruises', () => {
        ShoreExcursion.destinationDrpDwn.click();
        ShoreExcursion.alaskaCruise.click();
        ShoreExcursion.findExcursionBtn.click();
    });

    it('4.Then: Shore Excursion page is present', () => {
        ShoreExcursion.shoreExcrTitle.getText().then((title) => {
            expect(title).toBe('Shore Excursions');
            expect(ShoreExcursion.shoreTable.isDisplayed()).toBe(true);
        });
    });

    it('5.Then: I click "Port" blue button And Results are filtered by "Alaska Cruises"', () => {
        ShoreExcursion.portBtn.click();
        let list = [];
        ShoreExcursion.resultAlaska1.getText().then((result1) => {
            list.push(result1);

            expect(result1).toBe('Icy Strait Point, Alaska');
        });
        ShoreExcursion.resultAlaska2.getText().then((result2) => {
            list.push(result2);
            expect(result2).toBe('Juneau, Alaska');
        });
        ShoreExcursion.resultAlaska3.getText().then((result3) => {
            list.push(result3);
            expect(result3).toBe('Ketchikan, Alaska');
        });
        ShoreExcursion.resultAlaska4.getText().then((result4) => {
            list.push(result4);
            expect(result4).toBe('Seward, Alaska');
        });
        ShoreExcursion.resultAlaska5.getText().then((result5) => {
            list.push(result5);
            expect(result5).toBe('Sitka, Alaska');
        });
        ShoreExcursion.resultAlaska6.getText().then((result6) => {
            list.push(result6);
            expect(result6).toBe('Skagway, Alaska');
        });
        ShoreExcursion.resultAlaska7.getText().then((result7) => {
            list.push(result7);
            expect(result7).toBe('Victoria, British Columbia');
           // console.log(list);

            // for (let i = 0; NCLData.alaskaCruises.length; i++) {
            //     expect(list[i]).toEqual(NCLData.alaskaCruises[i].alaska$);
            // }
        });
    });
});