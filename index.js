


var currentWindowId;
browser.windows.getCurrent().then((window) => {
  currentWindowId = window.id;
});

browser.storage.local.get().then((item) => {

  if(item.supportedWindowId == currentWindowId){
    document.getElementById("js-currentWindowInfo").innerHTML += "Tabs are synchronysed in this window";
  }else{
    document.getElementById("js-currentWindowInfo").innerHTML += "Tabs are not synchronysed to this window";
  }

}, (error) => { console.log(error); });
