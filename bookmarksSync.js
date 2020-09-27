
const GROUP_COMMON_NO_SYNC = 1;
const GROUP_COMMON_SYNC = 2;

var activateListeners = true;
var tabsProcess = []; // Prevent repeating events system

// Setup storage

browser.storage.sync.get().then((data) => {
  browser.storage.sync.set({
    groupsTabs: (data.groupsTabs == undefined) ? {default: {}} : data.groupsTabs,
    sharedSyncTabs: (data.sharedSyncTabs == undefined) ? {} : data.sharedSyncTabs
  }).then(() => {}, (error) => { console.log(error); });
});

browser.storage.local.get().then((data) => {
  browser.storage.local.set({
    sharedNonSyncTabs: (data.sharedNonSyncTabs == undefined) ? {} : data.sharedNonSyncTabs
  }).then(() => {});
});




///////////////////////////
///// RESTORE SESSION /////
///////////////////////////

var restoreSession = function restoreSession(){
  browser.storage.local.get().then((localData) => {
    browser.storage.sync.get().then((syncData) => {

      activateListeners = false;

      browser.tabs.query({windowId: localData.supportedWindowId}).then((tabs) => { // Get tabs at index
        var tabsArray = [];
        for(let tab of tabs) tabsArray.push(tab.id);

        restoreSharedNonSyncTabs(localData);
        restoreSharedSyncTabs(syncData);
        restoreCurrentGroupTabs(localData, syncData);

        setTimeout(() => {
          browser.tabs.remove(tabsArray).then(() => {
            activateListeners = true;
            updateAllSavedTabs();
          });
        }, 2000);

        setTimeout(() => {
          activateListeners = true;
        }, 10000);

      });

    }, (error) => { console.log(error); });
  }, (error) => { console.log(error); });
}

function restoreSharedNonSyncTabs(localData){
  for(let tab of Object.values(localData.sharedNonSyncTabs)){
    browser.tabs.create({url: tab.url, pinned: true}).then(() => {});
    totalTabs++;
  }
}
function restoreSharedSyncTabs(syncData){
  for(let tab of Object.values(syncData.sharedSyncTabs)){
    browser.tabs.create({url: tab.url, pinned: true}).then(() => {});
  }
}
function restoreCurrentGroupTabs(localData, syncData){
  var currentGroup = syncData.groupsTabs[localData.currentGroup];
  if(currentGroup == undefined){
    currentGroup = syncData.groupsTabs[Object.keys(syncData.groupsTabs)[0]];
    browser.storage.local.set({
      currentGroup: Object.keys(syncData.groupsTabs)[0]
    }).then(() => {}, (error) => { console.log(error); });
  }
  if(Object.values(currentGroup).length == 0){
    browser.tabs.create({}).then(() => {});
  }
  for(let tab of Object.values(currentGroup)){
    browser.tabs.create({url: tab.url, pinned: tab.pinned}).then(() => {}, (error) => {
      browser.tabs.create({}).then(() => {});
    });
  }
}

// Setup storage vars
browser.windows.getAll({windowTypes: ["normal"]}).then((windows) => {
  browser.storage.local.set({
    supportedWindowId: windows[0].id,
    currentGroup: "default"
  }).then(() => {}, (error) => { console.log(error); });
});

//////////////////////////
///// SAVE FUNCTIONS /////
//////////////////////////

// Create or update a saved tab by it's group and index
var saveOrUpdateTab = function saveOrUpdateTab(tab, index, group, callBack){
  if(tabsProcess.includes(tab.id)) return; // Return if a process with this tab is already launched
  tabsProcess.push(tab.id); // Add this tab in the list of the current tab process

  if(group === GROUP_COMMON_NO_SYNC){ // Group Common No Sync

    browser.storage.local.get().then((data) => { // Get saved Data
      var sharedNonSyncTabs = data.sharedNonSyncTabs; // Get tabs list from data
      sharedNonSyncTabs[index+''] = { // Update tab at the specified index
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl
      };
      browser.storage.local.set({sharedNonSyncTabs}).then( // Update the DB with the modified tabs list
        () => { tabsProcess = arrayRemove(tabsProcess, tab.id); callBack();}, // Ok case : remove tab from the process list and call callBack
        (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); }); // Error case
    }, (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); }); // Error case

  }else if(group === GROUP_COMMON_SYNC){ // Group Common Sync

    browser.storage.sync.get().then((data) => { // Get saved Data
      var sharedSyncTabs = data.sharedSyncTabs; // Get tabs list from data
      sharedSyncTabs[index+''] = { // Update tab at the specified index
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl
      };
      browser.storage.sync.set({sharedSyncTabs}).then( // Update the DB with the modified tabs list
        () => { tabsProcess = arrayRemove(tabsProcess, tab.id); callBack();}, // Ok case : remove tab from the process list and call callBack
        (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); }); // Error case
    }, (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); }); // Error case
    
  }else{ // Custom group

    browser.storage.sync.get().then((data) => { // Get saved Data
      var groupsTabs = data.groupsTabs; // Get tabs list from data
      groupsTabs[group][index+''] = { // Update tab at the specified index
        url: tab.url,
        title: tab.title,
        pinned: tab.pinned,
        favIconUrl: tab.favIconUrl
      };
      browser.storage.sync.set({groupsTabs}).then( // Update the DB with the modified tabs list
        () => { console.log("added " + index); tabsProcess = arrayRemove(tabsProcess, tab.id); callBack();}, // Ok case : remove tab from the process list and call callBack
        (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); }); // Error case
    }, (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); }); // Error case
    
  }
}

// Remove a tab of the DB with the group index and the group name
var deleteSavedTabAfterIndex = function deleteSavedTabAfterIndex(index, group, callBack){

  if(group === GROUP_COMMON_NO_SYNC){ // Group Common No Sync

    browser.storage.local.get().then((data) => { // Get saved Data
      var sharedNonSyncTabs = data.sharedNonSyncTabs; // get tabs list from data
      while(sharedNonSyncTabs[index+''] != undefined){
        sharedNonSyncTabs[index+''] = undefined; // delete tab at the specific index
        index++;
      }
      browser.storage.local.set({sharedNonSyncTabs}).then(() => { callBack(); }, (error) => { console.log(error); }); // Update DB
    }, (error) => { console.log(error); });

  }else if(group === GROUP_COMMON_SYNC){ // Group Common Sync

    browser.storage.sync.get().then((data) => {
      var sharedSyncTabs = data.sharedSyncTabs;
      while(sharedSyncTabs[index+''] != undefined){
        sharedSyncTabs[index+''] = undefined
        index++;
      }
      browser.storage.sync.set({sharedSyncTabs}).then(() => { callBack(); }, (error) => { console.log(error); });
    }, (error) => { console.log(error); });
    
  }else{ // Custom Group

    browser.storage.sync.get().then((data) => {
      var groupsTabs = data.groupsTabs;
      while(groupsTabs[group][index+''] != undefined){
        groupsTabs[group][index+''] = undefined
        index++;
      }
      browser.storage.sync.set({groupsTabs}).then(() => { console.log("deleted " + index); callBack(); }, (error) => { console.log(error); });
    }, (error) => { console.log(error); });
    
  }
}

// Create or update saved tab by providing the tab Object
// This function uses searchSavedTab to determine the group index and tab group with the tab index 
var saveOrUpdateSavedTabByTab = function saveOrUpdateSavedTabByTab(tab){
  
  browser.storage.local.get().then((localData) => { // Get local data to get the currentGroup
    searchSavedTab(localData.currentGroup, tab.index, (tabData) => { // Search Tab saved

      if(tabData.group == undefined){ // Saved tab does not exist -> Update all to create tab
        updateAllSavedTabs();
      }else{ // Tab saved exist, update it
        saveOrUpdateTab(tab, tabData.index, tabData.group, () => {})
      }
    }, (error) => {});
  });
}

// get currentGroup to call updateNextTab() which will re-call himself for all tabs of the supported window.
var isUpdateAllSavedTabsActive = 0;
var updateAllSavedTabs = function updateAllSavedTabs(){
  if(isUpdateAllSavedTabsActive > 0){
    isUpdateAllSavedTabsActive++;
    return;
  } isUpdateAllSavedTabsActive = 1;
  console.log("///// START UPDATE ALL /////");

  browser.storage.local.get().then((localData) => { // Get the current group
    updateNextTab(0, localData.supportedWindowId, localData.currentGroup, () => { // Start a loop with updateNextTab() (He will re-call himself for all tabs)
        console.log("///// CALL BACK RECEIVED /////");
        if(isUpdateAllSavedTabsActive > 1){
          isUpdateAllSavedTabsActive = 0;
          updateAllSavedTabs();
        }else isUpdateAllSavedTabsActive = 0;
    });
  });
}

var forceUpdateAllSavedTabs = function forceUpdateAllSavedTabs(callBack){
  console.log("///// START UPDATE ALL /////");

  browser.storage.local.get().then((localData) => { // Get the current group
    updateNextTab(0, localData.supportedWindowId, localData.currentGroup, () => { // Start a loop with updateNextTab() (He will re-call himself for all tabs)
        console.log("///// CALL BACK RECEIVED /////");
        callBack();
    });
  });
}

// Update a tab and all next tabs (by index) (by re-call)
var updateNextTab = function updateNextTab(index, supportedWindowId, currentGroup, callBack){
  console.log("updateTab " + index);
  browser.tabs.query({index: index, windowId: supportedWindowId}).then((tabs) => { // Get tabs at index
    var tab = tabs[0]; // get tab from tabs list
    if(tab == undefined){ // id there no have tab at this index...
      deleteNextsSavedTab(index, currentGroup, callBack); // Delete all next tabs with deleteNextsSavedTab() (re-call himself)
      return;
    }

    searchSavedTab(currentGroup, tab.index, (tabData) => { // Search Tab saved

      saveOrUpdateTab(tab, tabData.index, (tabData.group == undefined) ? currentGroup : tabData.group, () => { // Update Tab
        updateNextTab(index +1, supportedWindowId, currentGroup, callBack); // Re-call himself for the next Tab
      });
      
    }, (error) => {});
  });
}
// Get informations and tabData from tab window index
var searchSavedTab = function searchSavedTab(currentGroup, totalIndex, callBack){

  browser.storage.local.get().then((data) => { // get local Data
    var sharedNonSyncTabs = data.sharedNonSyncTabs; // get shared non sync tabs list
    var sharedNonSyncLength = Object.keys(sharedNonSyncTabs).length; // get shared non sync tabs length

    var index = totalIndex; // for shared non sync tabs, the group index is the same than the window index
    if(index < sharedNonSyncLength && index >= 0){ // if index < this group length : tab are in the shared non sync group
      console.log(totalIndex + " is " + index + "/Common Non Sync");
      callBack({group: GROUP_COMMON_NO_SYNC, index: index, tab: sharedNonSyncTabs[index+'']}) // CallBack with infos
    }else{
      browser.storage.sync.get().then((data2) => { // Get synced data to request shared sync & curent group
        // get the list & length of the current & common sync groups
        var sharedSyncTabs = data2.sharedSyncTabs;
        var sharedSyncLength = Object.keys(sharedSyncTabs).length;
        var groupTabs = data2.groupsTabs[currentGroup];
        var groupLength = Object.keys(groupTabs).length;

        index -= sharedNonSyncLength; // The group index of the common/shared sync group is the window index - the size of the first group
        if(index < sharedSyncLength && index >= 0){ // Check if the tab is in the common sync group by the tab index and group size
          console.log(totalIndex + " is " + index + "/Common Sync");
          callBack({group: GROUP_COMMON_SYNC, index: index, tab: sharedSyncTabs[index+'']}); // CallBack with infos

        }else{
          index -= sharedSyncLength; // we remove the size of the second group to get the index in the unit of the third group indexes
          if(index < groupLength && index >= 0){ // Check if tab is in this custom group
            console.log(totalIndex + " is " + index + "/" + currentGroup);
            callBack({group: currentGroup, index: index, tab: sharedNonSyncTabs[index+'']}); // Callback with infos
          }else{
            console.log(totalIndex + " is " + " unknown, last Gindex = " + groupLength);
            callBack({index: groupLength}); // No groups : the index is to large : no saved tab, does not exist
          }
        }

      }, (error) => { console.log(error); });
    }

  }, (error) => { console.log(error); });

}
var countListsItems = function countListsItems(callBack){
  browser.storage.local.get().then((data) => {
    browser.storage.sync.get().then((data2) => {

      var sharedNonSyncTabs = data.sharedNonSyncTabs;
      var sharedNonSyncLength = Object.keys(sharedNonSyncTabs).length;
      var sharedSyncTabs = data2.sharedSyncTabs;
      var sharedSyncLength = Object.keys(sharedSyncTabs).length;
      var groupTabs = data2.groupsTabs[data.currentGroup];
      var groupLength = Object.keys(groupTabs).length;

      callBack(sharedNonSyncLength, sharedSyncLength, groupLength);

    }, (error) => { console.log(error); });
  }, (error) => { console.log(error); });
}
// Delete saved tabs who exist and with an index >= x (By re-call same function)
var deleteNextsSavedTab = function deleteNextsSavedTab(index, currentGroup, callBack){
  console.log("deleteTab " + index);
  searchSavedTab(currentGroup, index, (tabData) => { // Search Tab saved Object
    if(tabData.group != undefined){ // Saved tab exist
      deleteSavedTabAfterIndex(tabData.index, tabData.group, () => { // delete Tab saved
        deleteNextsSavedTab(index+1, currentGroup, callBack); // Repeat this for next tab
      });
    }else{
      callBack();
    }

  });
}

//////////////////////////
///// TABS LISTENERS /////
//////////////////////////

browser.tabs.onRemoved.addListener((tabId, removeInfo) => { // Remove Tab
  if(!activateListeners) return;
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == removeInfo.windowId){ // Update only if we are in the supported window
      setTimeout(() => {
        updateAllSavedTabs();
      }, 1000);
    }
  }, (error) => { console.log(error); });
});

browser.tabs.onDetached.addListener((tabId, detachInfo) => { // Remove Tab from this Window
  if(!activateListeners) return;
  updateAllSavedTabs();
});
browser.tabs.onCreated.addListener((tab) => { // Create Tab
  if(!activateListeners) return;
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == tab.windowId){ // Update only if we are in the supported window
      updateAllSavedTabs();
    }
  }, (error) => { console.log(error); });
});
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { // Update Tab
  if(!activateListeners) return;
  if(changeInfo.url != undefined || changeInfo.title != undefined || changeInfo.pinned != undefined){ // Update only if the URL was changed
    browser.storage.local.get().then((item) => { // Get supported Window Id
      if(item.supportedWindowId == tab.windowId){ // Update only if we are in the supported window
        saveOrUpdateSavedTabByTab(tab);
      }
    }, (error) => { console.log(error); });
  }
});
browser.tabs.onMoved.addListener((tabId, moveInfo) => { // Move Tab
  if(!activateListeners) return;
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == moveInfo.windowId){ // Update only if we are in the supported window
      updateAllSavedTabs();
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
