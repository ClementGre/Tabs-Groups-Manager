
const GROUP_COMMON_NO_SYNC = 1;
const GROUP_COMMON_SYNC = 2;

browser.windows.getAll({windowTypes: ["normal"]}).then((windows) => {
  browser.storage.local.set({
    supportedWindowId: windows[0].id,
    currentGroup: "default"
  }).then(() => {}, (error) => { console.log(error); });
});

var tabsProcess = []; // Prevent repeating events system

var __demo__groupsTabs = {
    "default": {
      "0": {
        url: "http://google.com/",
        title: "Google",
        pinned: true
      },
      "1": {
        url: "http://google.com/",
        title: "Google",
        pinned: false
      }
    },
    "work": {
      "0": {
        url: "http://google.com/",
        title: "Google",
        pinned: false
      },
      "1": {
        url: "http://google.com/",
        title: "Google",
        pinned: false
      }
    },
    "school": {}
  }
var __demo__sharedSyncTabs = {
    "0": {
      url: "http://google.com/",
      title: "Google"
    },
    "1": {
      url: "http://google.com/",
      title: "Google"
    }
  }
var __demo__sharedNonSyncTabs = {
    "0": {
      url: "https://pdf4teachers.org/",
      title: "PDF4Teachers"
    },
    "2": {
      url: "http://googledd.com/",
      title: "Googleddd"
    }
  }



browser.storage.sync.set({
  groupsTabs: {default: {}},
  sharedSyncTabs: {}
}).then(() => {}, (error) => { console.log(error); });
browser.storage.local.set({
  sharedNonSyncTabs: {}
}).then(() => {}, (error) => { console.log(error); });

//////////////////////////////
///// SAVE FUNCTIONS /////
//////////////////////////////

// Create new bookmark
var addSavedTab = function addSavedTab(tab, index, group, callBack){
  if(tabsProcess.includes(tab.id)) return;
  tabsProcess.push(tab.id);

  if(group === GROUP_COMMON_NO_SYNC){

    browser.storage.local.get().then((data) => {
      var sharedNonSyncTabs = data.sharedNonSyncTabs;
      sharedNonSyncTabs[index+''] = {
        url: tab.url,
        title: tab.title
      };
      browser.storage.local.set({sharedNonSyncTabs}).then(
        () => { tabsProcess = arrayRemove(tabsProcess, tab.id); callBack();},
        (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); });
    }, (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); });

  }else if(group === GROUP_COMMON_SYNC){

    browser.storage.sync.get().then((data) => {
      var sharedSyncTabs = data.sharedSyncTabs;
      sharedSyncTabs[index+''] = {
        url: tab.url,
        title: tab.title
      };
      browser.storage.sync.set({sharedSyncTabs}).then(
        () => { tabsProcess = arrayRemove(tabsProcess, tab.id); callBack();},
        (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); });
    }, (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); });
    
  }else{

    browser.storage.sync.get().then((data) => {
      var groupsTabs = data.groupsTabs;
      groupsTabs[group][index+''] = {
        url: tab.url,
        title: tab.title,
        pinned: tab.pinned
      };
      browser.storage.sync.set({groupsTabs}).then(
        () => { tabsProcess = arrayRemove(tabsProcess, tab.id); callBack();},
        (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); });
    }, (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); });
    
  }
}

var deleteSavedTab = function deleteSavedTab(index, group){

  if(group === GROUP_COMMON_NO_SYNC){

    browser.storage.local.get().then((data) => {
      var sharedNonSyncTabs = data.sharedNonSyncTabs;
      sharedNonSyncTabs[index+''] = undefined;
      browser.storage.local.set({sharedNonSyncTabs}).then(
        () => {},
        (error) => { console.log(error); });
    }, (error) => { console.log(error); });

  }else if(group === GROUP_COMMON_SYNC){

    browser.storage.sync.get().then((data) => {
      var sharedSyncTabs = data.sharedSyncTabs;
      sharedSyncTabs[index+''] = undefined;
      browser.storage.sync.set({sharedSyncTabs}).then(
        () => {},
        (error) => { console.log(error); });
    }, (error) => { console.log(error); });
    
  }else{

    browser.storage.sync.get().then((data) => {
      var groupsTabs = data.groupsTabs;
      groupsTabs[group][index+''] = undefined;
      browser.storage.sync.set({groupsTabs}).then(
        () => {},
        (error) => { console.log(error); });
    }, (error) => { console.log(error); });
    
  }
}

// Update a bookmark url and flags
var updateSavedTab = function updateSavedTab(tab, index, group, callBack){

  if(group === GROUP_COMMON_NO_SYNC){

    browser.storage.local.get().then((data) => {
      var sharedNonSyncTabs = data.sharedNonSyncTabs;
      sharedNonSyncTabs[index+''] = {
        url: tab.url,
        title: tab.title
      };
      browser.storage.local.set({sharedNonSyncTabs}).then(
        () => { tabsProcess = arrayRemove(tabsProcess, tab.id); callBack();},
        (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); });
    }, (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); });

  }else if(group === GROUP_COMMON_SYNC){

    browser.storage.sync.get().then((data) => {
      var sharedSyncTabs = data.sharedSyncTabs;
      sharedSyncTabs[index+''] = {
        url: tab.url,
        title: tab.title
      };
      browser.storage.sync.set({sharedSyncTabs}).then(
        () => { tabsProcess = arrayRemove(tabsProcess, tab.id); callBack();},
        (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); });
    }, (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); });
    
  }else{

    browser.storage.sync.get().then((data) => {
      var groupsTabs = data.groupsTabs;
      groupsTabs[group][index+''] = {
        url: tab.url,
        title: tab.title,
        pinned: tab.pinned
      };
      browser.storage.sync.set({groupsTabs}).then(
        () => { tabsProcess = arrayRemove(tabsProcess, tab.id); callBack();},
        (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); });
    }, (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); });
    
  }
}

// Update or create only one bookmark (call addBookmark or updateBookmark)
var addOrUpdateSavedTab = function addOrUpdateSavedTab(tab){

  browser.storage.local.get().then((localData) => { // Get supported Window Id and current group
    searchSavedTab(localData.currentGroup, tab.index, (tabData) => { // Search Tab saved Object

      if(tabData.group == undefined){ // Saved tab does not exist -> Update all
        updateAllSavedTabs();
      }else{ // Bookmark exist, update it
        updateSavedTab(tab, tabData.index, tabData.group, () => {})
      }
    }, (error) => {});
  });
}

// Iterate into tabs and update/create bookmarks for all pages
// After that, remove others unused bookmarks with deleteNextsBookmarks
var updateAllSavedTabs = function updateAllSavedTabs(){

  browser.storage.local.get().then((localData) => { // Get supported Window Id and current group
    browser.tabs.query({windowId: localData.supportedWindowId}).then((tabs) => { // get tabs of the supported window

      updateNextTab(0, localData.currentGroup);
    });
  });
}
var updateNextTab = function updateNextTab(index, currentGroup){

  browser.tabs.query({index: index}).then((tabs) => {
    var tab = tabs[0];
    if(tab == undefined){
      deleteNextsSavedTab(index, currentGroup);
      return;
    }

    searchSavedTab(currentGroup, tab.index, (tabData) => { // Search Tab saved Object

      if(tabData.group == undefined){ // Saved tab does not exist -> Create one
        addSavedTab(tab, tabData.index, currentGroup, () => {
          updateNextTab(index +1, currentGroup);
        });
      }else{ // Bookmark exist
        updateSavedTab(tab, tabData.index, tabData.group, () => {
          updateNextTab(index +1, currentGroup);
        });
      }
    }, (error) => {});
  });
}
var searchSavedTab = function searchSavedTab(currentGroup, totalIndex, callBack){

  browser.storage.local.get().then((data) => {
    var sharedNonSyncTabs = data.sharedNonSyncTabs;
    var sharedNonSyncLength = Object.keys(sharedNonSyncTabs).length;

    var index = totalIndex;
    if(index < sharedNonSyncLength && index >= 0){
      console.log("Commn no sync tab saved for totalIndex " + totalIndex);
      callBack({group: GROUP_COMMON_NO_SYNC, index: index, tab: sharedNonSyncTabs[index+'']})
    }else{
      browser.storage.sync.get().then((data2) => {
        var sharedSyncTabs = data2.sharedSyncTabs;
        var sharedSyncLength = Object.keys(sharedSyncTabs).length;
        var groupTabs = data2.groupsTabs[currentGroup];
        var groupLength = Object.keys(groupTabs).length;

        index -= sharedNonSyncLength;
        if(index < sharedSyncLength && index >= 0){
          console.log("Common sync tab saved for totalIndex " + totalIndex);
          callBack({group: GROUP_COMMON_SYNC, index: index, tab: sharedSyncTabs[index+'']});

        }else{
          index -= sharedSyncLength;
          if(index < groupLength && index >= 0){
            console.log("Group tab saved for totalIndex " + totalIndex);
            callBack({group: currentGroup, index: index, tab: sharedNonSyncTabs[index+'']});
          }else{
            console.log("No tab saved for totalIndex " + totalIndex + " -> return index " + groupLength);
            callBack({index: groupLength});
          }
        }

      }, (error) => { console.log(error); });
    }

  }, (error) => { console.log(error); });

}
// Delete Bookmark by tab Index (by Bookmark name) and repeat this for all above bookmarks
var deleteNextsSavedTab = function deleteNextsSavedTab(index, currentGroup){
  
  searchSavedTab(currentGroup, index, (tabData) => { // Search Tab saved Object

    if(tabData.group != undefined){ // Saved tab exist
      deleteSavedTab(tabData.index, tabData.group);
      deleteNextsSavedTab(index++, currentGroup);
    }

  });
}

//////////////////////////
///// TABS LISTENERS /////
//////////////////////////

browser.tabs.onRemoved.addListener((tabId, removeInfo) => { // Remove Tab
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == removeInfo.windowId){ // Update only if we are in the supported window
      setTimeout(() => {
        updateAllSavedTabs();
      }, 2000);
    }
  }, (error) => { console.log(error); });
});
browser.tabs.onDetached.addListener((tabId, detachInfo) => { // Remove Tab from this Window
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == detachInfo.windowId){ // Update only if we are in the supported window
      updateAllSavedTabs();
    }
  }, (error) => { console.log(error); });
});
browser.tabs.onCreated.addListener((tab) => { // Create Tab
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == tab.windowId){ // Update only if we are in the supported window
      updateAllSavedTabs();
    }
  }, (error) => { console.log(error); });
});
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { // Update Tab
  if(changeInfo.url){ // Update only if the URL was changed
    browser.storage.local.get().then((item) => { // Get supported Window Id
      if(item.supportedWindowId == tab.windowId){ // Update only if we are in the supported window
        addOrUpdateSavedTab(tab);
      }
    }, (error) => { console.log(error); });
  }
});
browser.tabs.onMoved.addListener((tabId, moveInfo) => { // Move Tab
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == moveInfo.windowId){ // Update only if we are in the supported window
      setTimeout(() => {
        updateAllSavedTabs();
      }, 2000);
    }
  }, (error) => { console.log(error); });
});

/////////////////
///// UTILS /////
/////////////////

function arrayRemove(arr, value) {
  return arr.filter(function(ele){
    return ele != value;
  });
}
