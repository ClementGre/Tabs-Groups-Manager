import * as restore from "./restore.js";

const GROUP_COMMON_NO_SYNC = 1;
const GROUP_COMMON_SYNC = 2;

window.enableListeners = true;
// Prevent repeating events system
let tabsProcess = [];

// Map tab id -> tab index
window.openedTabsIndexes = {};
window.lastOpenedTabsIndexes = {};

///////////////////////////
///// RESTORE SESSION /////
///////////////////////////

await browser.browserAction.setBadgeBackgroundColor({color: "#313236"});

window.restoreSession = function restoreSession() {
  restore.restore().then(() => {}, (error) => console.error(error))
}

//////////////////////////
///// SAVE FUNCTIONS /////
//////////////////////////

// Create or update a saved tab by it's group and index
let saveOrUpdateTab = async function saveOrUpdateTab(tab, index, group){
  if(tabsProcess.includes(tab.id)) return; // Return if a process with this tab is already launched
  tabsProcess.push(tab.id); // Add this tab in the list of the current tab process
  
  if(group === GROUP_COMMON_NO_SYNC || group === GROUP_COMMON_SYNC){
    
    try{
      const data = await getData(group);
      let tabs = data[getGroupPropertyName(group)]; // Get tabs list from data
      tabs[index+''] = { // Update tab at the specified index
        url: tab.url,
        title: tab.title
      };
      
      let obj = {}
      obj[getGroupPropertyName(group)] = tabs
      await browser.storage[getStorageName(group)].set(obj); // Update the DB with the modified tabs list
      tabsProcess = arrayRemove(tabsProcess, tab.id); // Remove tab from the process list and call callBack
    }catch(e){
      console.log(e);
      tabsProcess = arrayRemove(tabsProcess, tab.id);
    }
    
  }else{ // Custom group

    try{
      const syncData = await getSyncData();
  
      let groupsTabs = syncData.groupsTabs; // Get tabs list from data
      groupsTabs[group][index+''] = { // Update tab at the specified index
        url: tab.url,
        title: tab.title,
        pinned: tab.pinned
      };
      await browser.storage.sync.set({groupsTabs}); // Update the DB with the modified tabs list
      console.log("added " + index);
      tabsProcess = arrayRemove(tabsProcess, tab.id); // Ok case : remove tab from the process list and call callBack
    }catch(e){
      console.log(e);
      tabsProcess = arrayRemove(tabsProcess, tab.id);
    }
  }
}

// Create or update saved tab by providing the tab Object
// This function uses searchSavedTab to determine the group index and tab group with the tab index 
window.saveOrUpdateSavedTabByTab = function saveOrUpdateSavedTabByTab(tab){
  
  getLocalData().then((localData) => { // Get local data to get the currentGroup
    searchSavedTab(localData.currentGroup, tab.index).then((tabData) => { // Search Tab saved

      if(tabData.group ===undefined){ // Saved tab does not exist -> Update all to create tab
        updateAllSavedTabs().then(() => {});
      }else{ // Tab saved exist, update it
        saveOrUpdateTab(tab, tabData.index, tabData.group).then(() => {})
      }
    });
  });
}

// get currentGroup to call updateNextTab() which will re-call himself for all tabs of the supported window.
let isUpdateAllSavedTabsActive = 0;
window.updateAllSavedTabs = async function updateAllSavedTabs(){
  if(isUpdateAllSavedTabsActive > 0){
    console.log("updateAllSavedTabsIsActive counter = " + isUpdateAllSavedTabsActive);
    isUpdateAllSavedTabsActive++;
    if(isUpdateAllSavedTabsActive >= 5) isUpdateAllSavedTabsActive = 0;
    else return;
  } isUpdateAllSavedTabsActive = 1;
  
  console.log("///// START UPDATE ALL /////");
  
  const localData = await getLocalData();
  await updateNextTab(0, localData.supportedWindowId, localData.currentGroup) // Start a loop with updateNextTab() (it will re-call himself for all tabs)
  
  console.log("///// CALL BACK RECEIVED /////");
  
  if(isUpdateAllSavedTabsActive > 1){
    isUpdateAllSavedTabsActive = 0;
    await updateAllSavedTabs();
  }else isUpdateAllSavedTabsActive = 0;
  
}

/**
 * Update the mapping "window.openedTabsIndexes" that maps tab.id -> tab.index.
 * @return {Promise<void>}
 */
window.updateOpenedTabsIndexesMapping = async function updateOpenedTabsIndexesMapping(){
  const localData = await getLocalData();
  const tabs = await browser.tabs.query({windowId: localData.supportedWindowId}); // Get tabs at index
  
  window.lastOpenedTabsIndexes = window.openedTabsIndexes;
  window.openedTabsIndexes = {};
  for(let tab of tabs){
    window.openedTabsIndexes[tab.id] = tab.index;
  }
  
}

window.forceUpdateAllSavedTabs = async function forceUpdateAllSavedTabs(){
  console.log("///// START UPDATE ALL /////");

  const localData = await getLocalData(); // Get the current group
  await updateNextTab(0, localData.supportedWindowId, localData.currentGroup); // Start a loop with updateNextTab() (He will re-call himself for all tabs)
  
  console.log("///// PROMISE RESOLVED /////");
}

// Update a tab and all next tabs (by index) (by re-call)
let updateNextTab = async function updateNextTab(index, supportedWindowId, currentGroup, callBack){
  console.log("update tab " + index);
  const tabs = await browser.tabs.query({index: index, windowId: supportedWindowId}); // Get tabs at index
  let tab = tabs[0]; // get tab from tabs list
  if(tab === undefined){ // id here no have tab at this index...
    return deleteNextSavedTabs(index, currentGroup); // Delete all next tabs with deleteNextSavedTabs()
  }
  
  const tabData = await searchSavedTab(currentGroup, tab.index); // Search Tab saved
  
  await saveOrUpdateTab(tab, tabData.index, (tabData.group === undefined) ? currentGroup : tabData.group); // Update Tab
  await updateNextTab(index +1, supportedWindowId, currentGroup, callBack); // Re-call himself for the next Tab
}
// Get information and tabData from tab window index
window.searchSavedTab = async function searchSavedTab(currentGroup, totalIndex){
  return new Promise(async (resolve) => {
    console.log("searched tab " + totalIndex);
    const localData = await getLocalData();

    let sharedNonSyncTabs = localData.sharedNonSyncTabs; // get shared non sync tabs list
    let sharedNonSyncLength = Object.keys(sharedNonSyncTabs).length; // get shared non sync tabs length

    let index = totalIndex; // for shared non sync tabs, the group index is the same than the window index
    if(index < sharedNonSyncLength && index >= 0){ // if index < this group length : tab are in the shared non sync group
      console.log(totalIndex + " is " + index + "/Common Non Sync");
      resolve({group: GROUP_COMMON_NO_SYNC, index: index, tab: sharedNonSyncTabs[index + '']}) // CallBack with infos
    }else{
      const syncData = await getSyncData();
      // get the list & length of the current & common sync groups
      let sharedSyncTabs = syncData.sharedSyncTabs;
      let sharedSyncLength = Object.keys(sharedSyncTabs).length;
      let groupTabs = syncData.groupsTabs[currentGroup];
      let groupLength = Object.keys(groupTabs).length;

      index -= sharedNonSyncLength; // The group index of the common/shared sync group is the window index - the size of the first group
      if(index < sharedSyncLength && index >= 0){ // Check if the tab is in the common sync group by the tab index and group size
        console.log(totalIndex + " is " + index + "/Common Sync");
        resolve({group: GROUP_COMMON_SYNC, index: index, tab: sharedSyncTabs[index + '']}); // CallBack with infos

      }else{
        index -= sharedSyncLength; // we remove the size of the second group to get the index in the unit of the third group indexes
        if(index < groupLength && index >= 0){ // Check if tab is in this custom group
          console.log(totalIndex + " is " + index + "/" + currentGroup);
          resolve({group: currentGroup, index: index, tab: sharedNonSyncTabs[index + '']}); // Callback with infos
        }else{
          console.log(totalIndex + " is " + " unknown, last Gindex = " + groupLength);
          resolve({index: groupLength}); // No groups : the index is to large : no saved tab, does not exist
        }
      }
    }
  });
}
window.countListsLengths = function countListsLengths(callBack){
  getLocalData().then((data) => {
    getSyncData().then((data2) => {

      let sharedNonSyncTabs = data.sharedNonSyncTabs;
      let sharedNonSyncLength = Object.keys(sharedNonSyncTabs).length;
      let sharedSyncTabs = data2.sharedSyncTabs;
      let sharedSyncLength = Object.keys(sharedSyncTabs).length;
      let groupTabs = data2.groupsTabs[data.currentGroup];
      let groupLength = Object.keys(groupTabs).length;

      callBack(sharedNonSyncLength, sharedSyncLength, groupLength);

    }, (error) => { console.log(error); });
  }, (error) => { console.log(error); });
}
// Delete saved tabs with an index >= x
let deleteNextSavedTabs = function deleteNextSavedTabs(index, currentGroup){
  console.log("deleteTab " + index);

  return new Promise((resolve, reject) => {
    countListsLengths(async (sharedNonSyncLength, sharedSyncLength) => {
    
      let dataSpace;
      let startIndex;
      let groupPropertyName;
      let groupPropertySecondName = "";
      if(index < sharedNonSyncLength){
        dataSpace = browser.storage.local;
        groupPropertyName = "sharedNonSyncTabs";
        startIndex = 0;
      }else if(index < sharedSyncLength){
        dataSpace = browser.storage.sync;
        groupPropertyName = "sharedSyncTabs";
        startIndex = sharedNonSyncLength;
      }else{
        dataSpace = browser.storage.sync;
        groupPropertyName = "groupsTabs";
        groupPropertySecondName = currentGroup;
        startIndex = sharedNonSyncLength + sharedSyncLength
      }
    
      const data = await dataSpace.get();
      index -= startIndex;

      let groupTabs = data[groupPropertyName];
      if(groupPropertyName === "groupsTabs") groupTabs = groupTabs[groupPropertySecondName];
      
      let newGroupTabs = {}; let tabsCount = Object.keys(groupTabs).length; let i = 0; let newI = 0;
    
      while(tabsCount > 0){
        if(groupTabs[i] !== undefined){
          if(newI < index) newGroupTabs[newI] = groupTabs[i];
          tabsCount--; newI++;
        } i++;
      }
      if(i >= 100){
        console.log("Error: i >= 100"); return;
      }
      groupTabs = newGroupTabs;
      let obj = data
      if(groupPropertyName === "groupsTabs"){
        obj.groupsTabs[groupPropertySecondName] = groupTabs;
      }else obj[groupPropertyName] = groupTabs;
      dataSpace.set(obj).then(() => resolve(), e => reject(e));
    });
  });
}

////////////////////////////////
///// HIGH LEVEL FUNCTIONS /////
////////////////////////////////

window.loadGroup = async function loadGroup(group){
  console.log("Loading group " + group + "...");
  
  window.enableListeners = false;
  
  const localData = await getLocalData();
  const syncData = await getSyncData();
      
  const tabs = await browser.tabs.query({windowId: localData.supportedWindowId});
  let tabsArray = [];
  let i = Object.keys(localData.sharedNonSyncTabs).length + Object.keys(syncData.sharedSyncTabs).length;
  for(let tab of tabs){
    if(tab.index >= i) tabsArray.push(tab.id);
  }
  
  let tabsRemoved = false;
  for(let tabInfo of Object.values(syncData.groupsTabs[group])){
    try{
      await browser.tabs.create({url: tabInfo.url, pinned: tabInfo.pinned, windowId: localData.supportedWindowId, index: i});
    }catch(e){
      await browser.tabs.create({windowId: localData.supportedWindowId});
    }
    if(!tabsRemoved){
      await browser.tabs.remove(tabsArray);
      tabsRemoved = true;
    }
    i++;
  }
  if(i === 0) await browser.tabs.create({windowId: localData.supportedWindowId})
  if(!tabsRemoved) await browser.tabs.remove(tabsArray);
  
  await browser.storage.local.set({currentGroup: group});
  window.enableListeners = true;
  await updateAllSavedTabs();
  await browser.browserAction.setBadgeText({text: group.toUpperCase(), windowId: localData.supportedWindowId})
}

/////////////////
///// SETUP /////
/////////////////

browser.storage.sync.get().then(async (syncData) => {
  try{
    
    await browser.storage.sync.set({
      groupsTabs: (syncData.groupsTabs?.Default) ? syncData.groupsTabs : {Default: {}},
      sharedSyncTabs: (syncData.sharedSyncTabs) ? syncData.sharedSyncTabs : {}
    });
  
    const localData = await getLocalData();
  
    const windows = await browser.windows.getAll({windowTypes: ["normal"]});
  
    let group = localData.currentGroup;
    if(syncData.groupsTabs === undefined
        || syncData.groupsTabs[group] === undefined) group = "Default";
  
    await browser.storage.local.set({
      sharedNonSyncTabs: (localData.sharedNonSyncTabs ===undefined) ? {} : localData.sharedNonSyncTabs,
      supportedWindowId: windows[0].id,
      currentGroup: group
    });
    restoreSession();
    
  }catch(e){
    console.error("Unable to setup add-on: ", e)
  }

});

/////////////////
///// UTILS /////
/////////////////

/**
 *
 * @param data must be localData if listType == GROUP_COMMON_NO_SYNC, or syncData if listType == GROUP_COMMON_SYNC
 * @param groupType can be GROUP_COMMON_NO_SYNC (1) or GROUP_COMMON_SYNC  (2)
 * @param insert if true, insert a tab. if false, remove a tab.
 * @return Promise<void> resolved after storage editedname
 */
window.editGroupListSize = async function editGroupListSize(data, groupType, insert){

  const groupPropertyName = getGroupPropertyName(groupType);
  const storageName = getStorageName(groupType);

  let tabs = data[groupPropertyName];
  let length = Object.keys(tabs).length;

  if(insert) tabs[length+''] = {};
  else delete tabs[(length-1)+''];

  let newStorage = {}; newStorage[groupPropertyName] = tabs;
  
  await browser.storage[storageName].set(newStorage);
  await forceUpdateAllSavedTabs();
  
}

window.getSyncData = async function getSyncData(){
  return await browser.storage.sync.get();
}
window.getLocalData = async function getLocalData(){
  return await browser.storage.local.get();
}
async function getData(groupType){
  return groupType === GROUP_COMMON_SYNC ? await getSyncData() : await getLocalData();
}

function getStorageName(groupType){
  return groupType === GROUP_COMMON_SYNC ? "sync" : "local";
}
function getGroupPropertyName(groupType){
  return groupType === GROUP_COMMON_NO_SYNC ? "sharedNonSyncTabs" : "sharedSyncTabs";
}

function arrayRemove(arr, value) {
  return arr.filter(function(ele){
    return ele !== value;
  });
}