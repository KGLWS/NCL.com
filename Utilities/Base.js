const Base = function newBase(){
    this.homeUrl= 'https://www.ncl.com';
    
    this.navigateToHome = function newNavigateToHome(){
        browser.get(this.homeUrl);
    };
}
module.exports=new Base();