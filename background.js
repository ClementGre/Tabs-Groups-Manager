
const GROUP_COMMON_NO_SYNC = 1;
const GROUP_COMMON_SYNC = 2;

var activateListeners = true;
var tabsProcess = []; // Prevent repeating events system
var lastOpenedTabsIndexes = {};
var openedTabsIndexes = {};

///////////////////////////
///// RESTORE SESSION /////
///////////////////////////

browser.browserAction.setBadgeBackgroundColor({color: "#4967cf"});

var restoreSession = function restoreSession(){
  browser.storage.local.get().then((localData) => {
    browser.storage.sync.get().then((syncData) => {

      activateListeners = false;

      browser.tabs.query({windowId: localData.supportedWindowId}).then((tabs) => { // Get tabs
        var tabsArray = [];
        for(let tab of tabs) tabsArray.push(tab.id);

        var i = restoreSharedNonSyncTabs(localData, localData.supportedWindowId);
        i = restoreSharedSyncTabs(syncData, localData.supportedWindowId, i);
        restoreCurrentGroupTabs(localData, syncData, localData.supportedWindowId, i);

        setTimeout(() => {
          browser.tabs.remove(tabsArray).then(() => {
            activateListeners = true;
            updateAllSavedTabs();
          });
        }, 1000);

      });

      browser.browserAction.setBadgeText({text: localData.currentGroup.toUpperCase(), windowId: localData.supportedWindowId});

    }, (error) => { console.log(error); });
  }, (error) => { console.log(error); });
}

function restoreSharedNonSyncTabs(localData, windowId){
  var i = 0;
  for(let tab of Object.values(localData.sharedNonSyncTabs)){
    browser.tabs.create({url: tab.url, pinned: true, windowId: windowId, index: i}).then(() => {});
    i++;
  }
  return i;
}
function restoreSharedSyncTabs(syncData, windowId, i){
  for(let tab of Object.values(syncData.sharedSyncTabs)){
    browser.tabs.create({url: tab.url, pinned: true, windowId: windowId, index: i}).then(() => {});
    i++;
  }
  return i;
}
function restoreCurrentGroupTabs(localData, syncData, windowId, i){
  var currentGroup = syncData.groupsTabs[localData.currentGroup];
  if(currentGroup == undefined){
    currentGroup = syncData.groupsTabs[Object.keys(syncData.groupsTabs)[0]];
    browser.storage.local.set({
      currentGroup: currentGroup
    }).then(() => {}, (error) => { console.log(error); });
  }
  if(Object.values(currentGroup).length == 0 && i == 0){
    browser.tabs.create({windowId: windowId}).then(() => {});
  }
  for(let tab of Object.values(currentGroup)){
    browser.tabs.create({url: tab.url, pinned: tab.pinned, windowId: windowId, index: i}).then(() => {}, (error) => {
      browser.tabs.create({windowId: windowId}).then(() => {});
    });
    i++;
  }
}

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
        title: tab.title
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
        title: tab.title
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
        pinned: tab.pinned
      };
      browser.storage.sync.set({groupsTabs}).then( // Update the DB with the modified tabs list
        () => { console.log("added " + index); tabsProcess = arrayRemove(tabsProcess, tab.id); callBack();}, // Ok case : remove tab from the process list and call callBack
        (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); }); // Error case
    }, (error) => { console.log(error); tabsProcess = arrayRemove(tabsProcess, tab.id); }); // Error case
    
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
    console.log("updateAlSavedTabsIsActive counter = " + isUpdateAllSavedTabsActive);
    isUpdateAllSavedTabsActive++;
    if(isUpdateAllSavedTabsActive >= 5) isUpdateAllSavedTabsActive = 0;
    else return;
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
var updateAllOpenedTabsIndexes = function updateAllOpenedTabsIndexes(){
  browser.storage.local.get().then((localData) => { // Get the current group
    browser.tabs.query({windowId: localData.supportedWindowId}).then((tabs) => { // Get tabs at index
      lastOpenedTabsIndexes = openedTabsIndexes;
      openedTabsIndexes = {};
      for(let tab of tabs){
        openedTabsIndexes[tab.id] = tab.index;
      }
    }, (error) => {});
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
  console.log("update tab " + index);
  browser.tabs.query({index: index, windowId: supportedWindowId}).then((tabs) => { // Get tabs at index
    var tab = tabs[0]; // get tab from tabs list
    if(tab == undefined){ // id here no have tab at this index...
      deleteNextsSavedTab(index, currentGroup, callBack); // Delete all next tabs with deleteNextsSavedTab()
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
  console.log("searched tab " + totalIndex);
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
// Delete saved tabs with an index >= x
var deleteNextsSavedTab = function deleteNextsSavedTab(index, currentGroup, callBack){
  console.log("deleteTab " + index);

  countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
    if(index < sharedNonSyncLength){

      browser.storage.local.get().then((data) => { // Get saved Data

        var groupTabs = data.sharedNonSyncTabs;
        var newGroupTabs = {}; var tabsCount = Object.keys(groupTabs).length; var i = 0; var newI = 0;
        while(tabsCount > 0){
          if(groupTabs[i] != undefined){
            if(newI < index) newGroupTabs[newI] = groupTabs[i];
            tabsCount--; newI++;
          } i++;
          if(i >= 100){
            console.log("Error: i >= 100");
            return;
          }
        }
        groupTabs = newGroupTabs;

        browser.storage.local.set({sharedNonSyncTabs}).then(() => { callBack(); }, (error) => { console.log(error); }); // Update DB
      }, (error) => { console.log(error); });

    }else if(index < sharedSyncLength){
      browser.storage.sync.get().then((data) => {

        index -= (sharedNonSyncLength);
        var groupTabs = data.sharedSyncTabs;
        var newGroupTabs = {}; var tabsCount = Object.keys(groupTabs).length; var i = 0; var newI = 0;
        while(tabsCount > 0){
          if(groupTabs[i] != undefined){
            if(newI < index) newGroupTabs[newI] = groupTabs[i];
            tabsCount--; newI++;
          } i++;
        }
        if(i >= 100){
          console.log("Error: i >= 100");
          return;
        }
        groupTabs = newGroupTabs;

        browser.storage.sync.set({sharedSyncTabs: groupTabs}).then(() => { callBack(); }, (error) => { console.log(error); });
      }, (error) => { console.log(error); });

    }else{
      browser.storage.sync.get().then((data) => {

        index -= (sharedNonSyncLength + sharedSyncLength);
        var groupTabs = data.groupsTabs[currentGroup];
        var newGroupTabs = {}; var tabsCount = Object.keys(groupTabs).length; var i = 0; var newI = 0;
        while(tabsCount > 0){
          if(groupTabs[i] != undefined){
            if(newI < index) newGroupTabs[newI] = groupTabs[i];
            tabsCount--; newI++;
          } i++;
        }
        if(i >= 100){
          console.log("Error: i >= 100");
          return;
        }
        groupTabs = newGroupTabs;
        var groupsTabs = data.groupsTabs;
        groupsTabs[currentGroup] = groupTabs;

        browser.storage.sync.set({groupsTabs}).then(() => { callBack(); }, (error) => { console.log(error); });
      }, (error) => { console.log(error); });
    }
  });
}

//////////////////////////
///// TABS LISTENERS /////
//////////////////////////

browser.tabs.onRemoved.addListener((tabId, removeInfo) => { // Remove Tab
  var activateListenersLocal = activateListeners;
  if(removeInfo.isWindowClosing) return;
  browser.storage.local.get().then((data) => { // Get supported Window Id
    if(data.supportedWindowId == removeInfo.windowId){ // Update only if we are in the supported window
      updateAllOpenedTabsIndexes();
      if(!activateListenersLocal) return;

      searchSavedTab(data.currentGroup, lastOpenedTabsIndexes[tabId], (tabInfo) => {
        browser.storage.sync.get().then((syncData) => {
          if(tabInfo.group === GROUP_COMMON_NO_SYNC){
            editListsSizes(data, syncData, -1, 0, () => {
              setTimeout(() => {
                updateAllSavedTabs();
              }, 1000);
            });
          }else if(tabInfo.group === GROUP_COMMON_SYNC){
            editListsSizes(data, syncData, 0, -1, () => {
              setTimeout(() => {
                updateAllSavedTabs();
              }, 1000);
            });
          }else{
            setTimeout(() => {
              updateAllSavedTabs();
            }, 1000);
          }
        });
      });
    }
  }, (error) => { console.log(error); });
});

browser.tabs.onDetached.addListener((tabId, detachInfo) => { // Remove Tab from this Window
  var activateListenersLocal = activateListeners;
  updateAllOpenedTabsIndexes();
  if(!activateListenersLocal) return;

  browser.storage.local.get().then((data) => {
    if(data.supportedWindowId == detachInfo.oldWindowId){ // Remove a tab

      searchSavedTab(data.currentGroup, detachInfo.oldPosition, (tabInfo) => {
        browser.storage.sync.get().then((syncData) => {
          if(tabInfo.group === GROUP_COMMON_NO_SYNC){
            editListsSizes(data, syncData, -1, 0, () => {
              updateAllSavedTabs();
            });
          }else if(tabInfo.group === GROUP_COMMON_SYNC){
            editListsSizes(data, syncData, 0, -1, () => {
              updateAllSavedTabs();
            });
          }else{
            updateAllSavedTabs();
          }
        });
      });
    }else{ // Add a tab
      updateAllSavedTabs();
    }
  }, (error) => { console.log(error); });

});
browser.tabs.onCreated.addListener((tab) => { // Create Tab
  var activateListenersLocal = activateListeners;
  browser.storage.local.get().then((data) => { // Get supported Window Id
    if(data.supportedWindowId == tab.windowId){ // Update only if we are in the supported window
      updateAllOpenedTabsIndexes();
      if(!activateListenersLocal) return;
      updateAllSavedTabs();
    }
  }, (error) => { console.log(error); });
});
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { // Update Tab
  var activateListenersLocal = activateListeners;
  if(!activateListenersLocal) return;
  if(changeInfo.url != undefined || changeInfo.title != undefined || changeInfo.pinned != undefined){ // Update only if the URL was changed
    browser.storage.local.get().then((data) => { // Get supported Window Id
      if(data.supportedWindowId == tab.windowId){ // Update only if we are in the supported window

        if(changeInfo.pinned === false){
          searchSavedTab(data.currentGroup, tab.index, (tabInfo) => {

            if(tabInfo.group === GROUP_COMMON_NO_SYNC || tabInfo.group === GROUP_COMMON_SYNC){
              
              searchSavedTab(data.currentGroup, lastOpenedTabsIndexes[tab.id], (lastTabInfo) => {
                browser.storage.sync.get().then((syncData) => {
                  if(lastTabInfo.group === GROUP_COMMON_NO_SYNC){
                    editListsSizes(data, syncData, -1, 0, () => {
                      updateAllSavedTabs();
                      browser.tabs.executeScript({code : 'alert("The Common tabs have to stay pinned, this tab is not anymore a Common tab.")'});
                    });
                  }else{
                    editListsSizes(data, syncData, 0, -1, () => {
                      updateAllSavedTabs();
                      browser.tabs.executeScript({code : 'alert("The Common tabs have to stay pinned, this tab is not anymore a Common tab.")'});
                    });
                  }
                });
              });
            }else{
              saveOrUpdateSavedTabByTab(tab);
            }
          });
        }else{
          saveOrUpdateSavedTabByTab(tab);
        }
        
      }
    }, (error) => { console.log(error); });
  }
});
var moveListener = function moveListener(tabId, moveInfo){ // Move Tab
  var activateListenersLocal = activateListeners;
  updateAllOpenedTabsIndexes();
  if(!activateListenersLocal){
    console.log("Listeners are disabled...");
    return;
  }
  console.log("A tab was moved...");
  browser.storage.local.get().then((data) => { // Get supported Window Id
    if(data.supportedWindowId == moveInfo.windowId){ // Update only if we are in the supported window
      countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
        searchSavedTab(data.currentGroup, moveInfo.fromIndex, (tabInfo) => {
          if(!activateListeners) return;
          if(tabInfo.group === GROUP_COMMON_NO_SYNC){
            if(moveInfo.toIndex >= sharedNonSyncLength){
              activateListeners = false;
              browser.tabs.move([tabId], {index: sharedNonSyncLength-1}).then(() => {
                activateListeners = true;
                browser.tabs.executeScript({code : 'alert("The No Synced Common tabs can\'t be after the Synced Common tabs")'});
              }, (error) => { console.log(error); activateListeners = true; });
              return;
            }
          }else if(tabInfo.group === GROUP_COMMON_SYNC){
            if(moveInfo.toIndex >= (sharedNonSyncLength + sharedSyncLength)){
              activateListeners = false;
              browser.tabs.move([tabId], {index: sharedNonSyncLength+sharedSyncLength-1}).then(() => {
                activateListeners = true;
                browser.tabs.executeScript({code : 'alert("The Common tabs can\'t be after the Group tabs")'});
              }, (error) => { console.log(error); activateListeners = true; });
              return;
            }else if(moveInfo.toIndex < sharedNonSyncLength){
              activateListeners = false;
              browser.tabs.move([tabId], {index: sharedNonSyncLength}).then(() => {
                activateListeners = true;
                browser.tabs.executeScript({code : 'alert("The Synced Common tabs can\'t be before the No Synced Common tabs")'});
              }, (error) => { console.log(error); activateListeners = true; });
              return;
            }
          }else{
            if(moveInfo.toIndex < (sharedNonSyncLength + sharedSyncLength)){
              activateListeners = false;
              browser.tabs.move([tabId], {index: sharedNonSyncLength+sharedSyncLength}).then(() => {
                activateListeners = true;
                browser.tabs.executeScript({code : 'alert("The Group tabs can\'t be before the Common tabs")'});
              }, (error) => { console.log(error); activateListeners = true; });
              return;
            }
          }
          updateAllSavedTabs();
          
        });
      });
    }
  }, (error) => { console.log(error); });
};
browser.tabs.onMoved.addListener(moveListener);

/////////////////
///// SETUP /////
/////////////////

browser.storage.sync.get().then((syncData) => {

  browser.storage.sync.set({
    groupsTabs: (syncData.groupsTabs == undefined) ? {Default: {}} : (syncData.groupsTabs.Default == undefined) ? {Default: {}} : syncData.groupsTabs,
    sharedSyncTabs: (syncData.sharedSyncTabs == undefined) ? {} : syncData.sharedSyncTabs
  }).then(() => {

    browser.storage.local.get().then((localData) => {
      browser.windows.getAll({windowTypes: ["normal"]}).then((windows) => {
        
        var group = localData.currentGroup;
        if(syncData.groupsTabs == undefined) group = "Default";
        else if(syncData.groupsTabs[group] == undefined) group = "Default";

        browser.storage.local.set({
          sharedNonSyncTabs: (localData.sharedNonSyncTabs == undefined) ? {} : localData.sharedNonSyncTabs,
          supportedWindowId: windows[0].id,
          currentGroup: group
        }).then(() => {
          restoreSession();
        }, (error) => { console.log(error); });

      });
    });

  }, (error) => { console.log(error); });

});

/////////////////
///// UTILS /////
/////////////////

function editListsSizes(localData, syncData, sharedNonSync, sharedSync, callBack){
  var sharedSyncTabs = syncData.sharedSyncTabs;
  var sharedSyncLength = Object.keys(sharedSyncTabs).length;
  var sharedNonSyncTabs = localData.sharedNonSyncTabs;
  var sharedNonSyncLength = Object.keys(sharedNonSyncTabs).length;

  if(sharedNonSync != 0){
    if(sharedNonSync < 0){
      delete sharedNonSyncTabs[(sharedNonSyncLength-1)+''];
    }else{
      sharedNonSyncTabs[sharedNonSyncLength+''] = {};
    }
    browser.storage.local.set({sharedNonSyncTabs}).then(() => {

      if(sharedSync != 0){
        if(sharedSync < 0){
          delete sharedSyncTabs[(sharedSyncLength-1)+''];
        }else{
          sharedSyncTabs[sharedSyncLength+''] = {};
        }
        browser.storage.sync.set({sharedSyncTabs}).then(() => {
          callBack();
        });
      }else callBack();

    });
  }else if(sharedSync != 0){

    if(sharedSync < 0){
      delete sharedSyncTabs[(sharedSyncLength-1)+''];
    }else{
      sharedSyncTabs[sharedSyncLength+''] = {};
    }
    browser.storage.sync.set({sharedSyncTabs}).then(() => {
      callBack();
    });

  }else{
    callBack();
  }
}

function arrayRemove(arr, value) {
  return arr.filter(function(ele){
    return ele != value;
  });
}
