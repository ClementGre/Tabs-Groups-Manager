
const GROUP_COMMON_NO_SYNC = 1;
const GROUP_COMMON_SYNC = 2;
const GROUP_NORMAL = 0;

let currentWindowId;
browser.windows.getCurrent().then((window) => {
  currentWindowId = window.id;
});

let lastGroup;
let lastGroupType;
let lastIsProtectedGroup;

let currentTab;
let localData = {};
let syncData = {};
setInterval(() => {
  browser.storage.sync.get().then((newSyncData) => {
    if(JSON.stringify(newSyncData) !== JSON.stringify(syncData)) reload();
    else{
      browser.storage.local.get().then((newLocalData) => {
        if(JSON.stringify(newLocalData) !== JSON.stringify(localData)) reload();
      });
    }
    browser.tabs.query({active: true, windowId: currentWindowId}).then((currentTabs) => {
      if(currentTab.id != currentTabs[0].id){
        console.log("reloading because of currentTab has changed");
        reload();
      }
    });
  });

}, 1000);

let updateGroupsListPanel = function updateGroupsListPanel(){
  console.log(localData);
  console.log(syncData);

  // Current window info

  if(localData.supportedWindowId === currentWindowId){
    document.getElementById("js-currentWindowInfo").innerHTML = "Tabs are synchronysed in this window. " + '<a id="js-currentWindowInfo-unsync">Disable</a>';
    document.getElementById("js-currentWindowInfo-unsync").onmousedown = () => {
      browser.storage.local.set({supportedWindowId: -1}).then(() => {
        browser.browserAction.setBadgeText({text: "", windowId: localData.supportedWindowId});
        alert("The tabs of this window are no more synchronysed into groups and cloud");
        window.location.href = window.location.pathname + window.location.search + window.location.hash;
      }, (error) => { console.log(error); });
    };
  }else{
    document.getElementById("js-currentWindowInfo").innerHTML = "Tabs are not synchronysed to this window. " + '<a id="js-currentWindowInfo-sync">Enable</a>'
    document.getElementById("js-currentWindowInfo-sync").onmousedown = () => {
      let r = confirm("All the tabs of this window will be replaced by the groups tabs.");
      if(r === true){
        browser.storage.local.set({supportedWindowId: currentWindowId}).then(() => {
          window.location.href = window.location.pathname + window.location.search + window.location.hash;
          browser.runtime.getBackgroundPage().then((page) => {
            page.restoreSession();
          });
        }, (error) => { console.log(error); }); 
      }
    };
  }

  // Shared groups | COUNTERS
  document.getElementById("js-shared-non-sync-tabs-open").innerHTML = 'No Synced Common Tabs<disc> · ' + Object.keys(localData.sharedNonSyncTabs).length + ' tabs</disc>';
  document.getElementById('js-shared-non-sync-tabs-div').setAttribute('title', 'Click to open details\n\n' + listTabs(localData.sharedNonSyncTabs));
  document.getElementById('js-shared-non-sync-tabs-show').setAttribute('title', 'Click to open details');
  document.getElementById('js-shared-non-sync-tabs-show').onmousedown = () => { // OPEN GROUP
    console.log("Opening details page of group No Synced Common");
    updateGroupDetailsPanel("No Synced Common", GROUP_COMMON_NO_SYNC, true);
  }
  document.getElementById('js-shared-non-sync-tabs-open').onmousedown = () => { // OPEN GROUP
    console.log("Opening details page of group No Synced Common");
    updateGroupDetailsPanel("No Synced Common", GROUP_COMMON_NO_SYNC, true);
  }

  document.getElementById("js-shared-sync-tabs-open").innerHTML = 'Synced Common Tabs<disc> · ' + Object.keys(syncData.sharedSyncTabs).length + ' tabs</disc>';
  document.getElementById('js-shared-sync-tabs-div').setAttribute('title', 'Click to open details\n\n' + listTabs(syncData.sharedSyncTabs));
  document.getElementById('js-shared-sync-tabs-show').setAttribute('title', 'Click to open details');
  document.getElementById('js-shared-sync-tabs-show').onmousedown = () => { // OPEN GROUP
    console.log("Opening details page of group Synced Common");
    updateGroupDetailsPanel("Synced Common", GROUP_COMMON_SYNC, true);
  }
  document.getElementById('js-shared-sync-tabs-open').onmousedown = () => { // OPEN GROUP
    console.log("Opening details page of group Synced Common");
    updateGroupDetailsPanel("Synced Common", GROUP_COMMON_SYNC, true);
  }

  // Custom groups | COUNTERS

  document.getElementById("js-groups-tab").innerHTML = '';
  for(let groupName of Object.keys(syncData.groupsTabs)){

    let tabs = syncData.groupsTabs[groupName];
    document.getElementById("js-groups-tab").innerHTML += 
      '<div id="js-group-' + groupName + '-div" class="group-div ' + ((groupName == localData.currentGroup) ? 'active' : '') + '">' +
        '<p id="js-group-' + groupName + '-open">Group ' + groupName + "<disc> · " + Object.keys(tabs).length + ' tabs</disc></p>' +
        '<i id="js-group-' + groupName + '-show" class="fas fa-arrow-right"></i>' +
      '</div>';
    document.getElementById('js-group-' + groupName + '-open').setAttribute('title', 'Click to load group\n\n' + listTabs(tabs));
    document.getElementById('js-group-' + groupName + '-show').setAttribute('title', 'Click to open details');
    if(currentWindowId != localData.supportedWindowId || groupName == localData.currentGroup){
      document.getElementById('js-group-' + groupName + '-show').setAttribute('class', 'pre-active fas fa-arrow-right');
      document.getElementById('js-group-' + groupName + '-open').setAttribute('title', 'Click to open details\n\n' + listTabs(tabs));
    }

  }
  for(let groupName of Object.keys(syncData.groupsTabs)){
    
    document.getElementById('js-group-' + groupName + '-open').onmousedown = () => { // LOAD GROUP
      if(currentWindowId != localData.supportedWindowId || groupName == localData.currentGroup){
        updateGroupDetailsPanel(groupName, GROUP_NORMAL, (groupName == "Default"));
      }else{
        loadGroup(groupName, () => {});
      }
    }
    document.getElementById('js-group-' + groupName + '-show').onmousedown = () => { // OPEN GROUP
      console.log("Opening details page of group " + groupName);
      updateGroupDetailsPanel(groupName, GROUP_NORMAL, (groupName == "Default"));
    }

  }



  // Create group

  document.getElementById("js-create-group").onmousedown = () => { // CREATE GROUP
    let groupsTabs = syncData.groupsTabs;

    let name = window.prompt("Choose the group name", "New Group");
    while(name != null && name != ''){
      
      if(groupsTabs[name] == undefined){
        groupsTabs[name] = {};
        browser.storage.sync.set({groupsTabs}).then(() => {
          reload();
        });
        return;
      }else{
        alert("This group already exists.");
      }
      name = window.prompt("Choose the group name", name);
    }
    
  }

  // Actions buttons

  browser.runtime.getBackgroundPage().then((page) => {
    page.searchSavedTab(localData.currentGroup, currentTab.index, (savedTabData) => {
      if(currentWindowId == localData.supportedWindowId){
        if(savedTabData.group === GROUP_COMMON_SYNC){

          document.getElementById("js-tab-actions-common").setAttribute('class', 'active');
          document.getElementById("js-tab-actions-sync").setAttribute('class', 'noactive');

          document.getElementById("js-tab-actions-common").onmousedown = () => { // From Common Sync to Group

            page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
              let targetIndex = sharedNonSyncLength + sharedSyncLength - 1;

              page.activateListeners = false;
              browser.tabs.update(currentTab.id, {pinned: false}).then(() => {
                browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                  page.activateListeners = true;
                  editListsSizes(page, localData, syncData, 0, -1);
                }, (error) => { console.log(error); activateListeners = true; });
              }, (error) => { console.log(error); activateListeners = true; });

            });
          };
          document.getElementById("js-tab-actions-sync").onmousedown = () => { // From Common Sync to Common no Sync

            page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
              let targetIndex = sharedNonSyncLength;

              page.activateListeners = false;
              browser.tabs.update(currentTab.id, {pinned: true}).then(() => {
                browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                  page.activateListeners = true;
                  editListsSizes(page, localData, syncData, 1, -1);
                }, (error) => { console.log(error); activateListeners = true; });
              }, (error) => { console.log(error); activateListeners = true; });

            });
          };

        }else if(savedTabData.group === GROUP_COMMON_NO_SYNC){

          document.getElementById("js-tab-actions-common").setAttribute('class', 'active');
          document.getElementById("js-tab-actions-sync").setAttribute('class', 'active');

          document.getElementById("js-tab-actions-common").onmousedown = () => { // From Common no Sync to Group

            page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
              let targetIndex = sharedNonSyncLength + sharedSyncLength - 1;

              page.activateListeners = false;
              browser.tabs.update(currentTab.id, {pinned: false}).then(() => {
                browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                  page.activateListeners = true;
                  editListsSizes(page, localData, syncData, -1, 0);
                }, (error) => { console.log(error); activateListeners = true; });
              }, (error) => { console.log(error); activateListeners = true; });

            });
          };

          document.getElementById("js-tab-actions-sync").onmousedown = () => { // From Common no Sync to Common Sync

            page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
              let targetIndex = sharedNonSyncLength - 1;

              page.activateListeners = false;
              browser.tabs.update(currentTab.id, {pinned: true}).then(() => {
                browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                  page.activateListeners = true;
                  editListsSizes(page, localData, syncData, -1, 1);
                }, (error) => { console.log(error); activateListeners = true; });
              }, (error) => { console.log(error); activateListeners = true; });

            });
          };

        }else{
          document.getElementById("js-tab-actions-common").setAttribute('class', 'noactive');
          document.getElementById("js-tab-actions-sync").setAttribute('class', 'noactive');

          document.getElementById("js-tab-actions-common").onmousedown = () => { // From group to Common Sync
            page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
              let targetIndex = sharedNonSyncLength + sharedSyncLength;

              page.activateListeners = false;
              browser.tabs.update(currentTab.id, {pinned: true}).then(() => {
                browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                  page.activateListeners = true;
                  editListsSizes(page, localData, syncData, 0, 1);
                }, (error) => { console.log(error); activateListeners = true; });
              }, (error) => { console.log(error); activateListeners = true; });

            });
          };
          
          document.getElementById("js-tab-actions-sync").onmousedown = () => { // From Group to Common no sync

            page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
              let targetIndex = sharedNonSyncLength;

              page.activateListeners = false;
              browser.tabs.update(currentTab.id, {pinned: true}).then(() => {
                browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                  page.activateListeners = true;
                  editListsSizes(page, localData, syncData, 1, 0);
                }, (error) => { console.log(error); activateListeners = true; });
              }, (error) => { console.log(error); activateListeners = true; });

            });
          };
        }
      }else{
        document.getElementById("js-tab-actions-common").setAttribute('style', 'display: none;');
        document.getElementById("js-tab-actions-sync").setAttribute('style', 'display: none;');
        document.getElementById("js-tab-actions-moveall").setAttribute('style', 'display: inline-block;');
      }

      document.getElementById("js-tab-actions-move").onmousedown = (e) => { // Move current tab into a group
        browser.tabs.query({active: true, windowId: currentWindowId}).then((currentTabs) => {
          moveTabsAutoMenu(currentTabs, e.x);
        });
        
      };
      document.getElementById("js-tab-actions-moveall").onmousedown = (e) => { // Move all tabs into a group
        browser.tabs.query({windowId: currentWindowId}).then((tabs) => {
          moveTabsAutoMenu(tabs, e.x);
        });
      };
    });
  });
  hideLoader();
}

function updateGroupDetailsPanel(group, groupType, isProtectedGroup){
  console.log(syncData.groupsTabs);

  lastGroup = group;
  lastGroupType = groupType;
  lastIsProtectedGroup = isProtectedGroup;
  
  document.getElementById("js-group-tabs").innerHTML = '';

  let groupTabs;
  if(groupType == GROUP_COMMON_NO_SYNC){
    groupTabs = localData.sharedNonSyncTabs;
  }else if(groupType == GROUP_COMMON_SYNC){
    groupTabs = syncData.sharedSyncTabs;
  }else{
    groupTabs = syncData.groupsTabs[group];
  }
  Object.keys(groupTabs).forEach(function(index){
    let tabData = groupTabs[index];
    document.getElementById("js-group-tabs").innerHTML += 
      '<div id="js-tab-' + index + '-div" class="group-div ' + (tabData.pinned ? 'active' : '') + '">' +
        '<p id="js-tab-' + index + '-open">' + tabData.title + '</p>' +
        '<i id="js-tab-' + index + '-delete" class="fas fa-trash-alt"></i>' +
      '</div>';
    document.getElementById('js-tab-' + index + '-delete').setAttribute('title', 'Delete this tab from this group');
  });
  let i = 0;
  Object.keys(groupTabs).forEach(function(index){
    let tabData = groupTabs[index];

    document.getElementById('js-tab-' + index + '-open').setAttribute("title", 'Click to open this tab\n\n' + tabData.title + '\n' + tabData.url);

    document.getElementById('js-tab-' + index + '-open').onmousedown = () => { // Open tab
      if(groupType == GROUP_COMMON_NO_SYNC){
        browser.tabs.create({url: localData.sharedNonSyncTabs[index].url}).then(() => {
          setTimeout(function() {
            reloadAll(group, groupType, isProtectedGroup);
          }, 1000);
        });
      }else if(groupType == GROUP_COMMON_SYNC){
        browser.tabs.create({url: syncData.sharedSyncTabs[index].url}).then(() => {
          setTimeout(function() {
            reloadAll(group, groupType, isProtectedGroup);
          }, 1000);
        });
      }else{
        browser.tabs.create({url: syncData.groupsTabs[group][index].url}).then(() => {
          setTimeout(function() {
            reloadAll(group, groupType, isProtectedGroup);
          }, 1000);
        });
      }
    }

    if(groupType == GROUP_COMMON_NO_SYNC){
      document.getElementById('js-tab-' + index + '-delete').onmousedown = () => { // Delete tab (common no sync)
        let sharedNonSyncTabs = localData.sharedNonSyncTabs;
        delete sharedNonSyncTabs[index];
        getCloseVars((page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs) => {
          reorganizeAndUpdateGroup(sharedNonSyncTabs, GROUP_COMMON_NO_SYNC, null, null, () => {
            closeTabs([tabs[0].id], sharedNonSyncLength+sharedSyncLength+groupLength, page);
          });
        }, Number(index), 0);
        
      }
    }else if(groupType == GROUP_COMMON_SYNC){
      document.getElementById('js-tab-' + index + '-delete').onmousedown = () => { // Delete tab (common sync)
        let sharedSyncTabs = syncData.sharedSyncTabs;
        delete sharedSyncTabs[index];
        getCloseVars((page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs) => {
          reorganizeAndUpdateGroup(sharedSyncTabs, GROUP_COMMON_SYNC, null, null, () => {
            closeTabs([tabs[0].id], sharedNonSyncLength+sharedSyncLength+groupLength, page);
          });
        }, Number(index), 1);
        
      }
    }else{
      document.getElementById('js-tab-' + index + '-delete').onmousedown = () => { // Delete tab (normal group)
        let groupsTabs = syncData.groupsTabs;
        delete groupsTabs[group][index];
        getCloseVars((page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs) => {
          reorganizeAndUpdateGroup(groupsTabs[group], GROUP_NORMAL, group, groupsTabs, () => {
            closeTabs([tabs[0].id], sharedNonSyncLength+sharedSyncLength+groupLength, page);
          });
        }, Number(index), 2);
        
      }
    }
    
    i++;
  });
  if(i == 0) document.getElementById("js-group-empty-message").setAttribute('style', '');
  else document.getElementById("js-group-empty-message").setAttribute('style', 'display: none;');
  

  // OPEN GROUP

  document.getElementById("js-open-group").setAttribute('style', '');
  if(i == 0 && (localData.supportedWindowId != currentWindowId)){
    document.getElementById("js-open-group").setAttribute('style', 'display: none;');

  }else if(localData.supportedWindowId != currentWindowId){
    document.getElementById("js-open-group-text").innerHTML = "Open all tabs";
    document.getElementById("js-open-group").onmousedown = () => { // Open Group tabs
      if(groupType == GROUP_COMMON_NO_SYNC){
        for(let tabInfo of Object.values(localData.sharedNonSyncTabs)){
          browser.tabs.create({url: tabInfo.url}).then(() => {});
        }
      }else if(groupType == GROUP_COMMON_SYNC){
        for(let tabInfo of Object.values(syncData.sharedSyncTabs)){
          browser.tabs.create({url: tabInfo.url}).then(() => {});
        }
      }else{
        for(let tabInfo of Object.values(syncData.groupsTabs[group])){
          browser.tabs.create({url: tabInfo.url}).then(() => {});
        }
      }
    }
    
  }else if(groupType == GROUP_COMMON_NO_SYNC || groupType == GROUP_COMMON_SYNC || localData.currentGroup == group){
    document.getElementById("js-open-group").setAttribute('style', 'display: none;');

  }else{
    document.getElementById("js-open-group-text").innerHTML = "Load group";
    document.getElementById("js-open-group").onmousedown = () => { // Load Group
      loadGroup(group);
    }
    
  }

  // ACTIONS
  document.getElementById("js-tab-actions-back").onmousedown = () => { // Back
    document.getElementById("mainTag").setAttribute('class', 'unswitched');
  }
  if(groupType == GROUP_COMMON_NO_SYNC){
    document.getElementById("js-tab-actions-clear").onmousedown = () => { // Clear group (commom no sync)
      let sharedNonSyncTabs = localData.sharedNonSyncTabs;
      sharedNonSyncTabs = {};
      getCloseVars((page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs) => {
        reorganizeAndUpdateGroup(sharedNonSyncTabs, GROUP_COMMON_NO_SYNC, null, null, () => {
          let toClose = []; for(let tab of tabs){ if(tab.index < sharedNonSyncLength) toClose.push(tab.id); }
          closeTabs(toClose, sharedNonSyncLength+sharedSyncLength+groupLength, page);
        });
      });
    }
  }else if(groupType == GROUP_COMMON_SYNC){
    document.getElementById("js-tab-actions-clear").onmousedown = () => { // Clear group (common sync)
      let sharedSyncTabs = syncData.sharedSyncTabs;
      sharedSyncTabs = {};
      getCloseVars((page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs) => {
        reorganizeAndUpdateGroup(sharedSyncTabs, GROUP_COMMON_SYNC, null, null, () => {
          let toClose = []; for(let tab of tabs){ if(tab.index >= sharedNonSyncLength && tab.index < (sharedNonSyncLength+sharedSyncLength)) toClose.push(tab.id); }
          closeTabs(toClose, sharedNonSyncLength+sharedSyncLength+groupLength, page);
        });
      });
    }
  }else{
    document.getElementById("js-tab-actions-clear").onmousedown = () => { // Clear group (normal group)
      let groupsTabs = syncData.groupsTabs;
      groupsTabs[group] = {};
      getCloseVars((page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs) => {
        reorganizeAndUpdateGroup(groupsTabs[group], GROUP_NORMAL, group, groupsTabs, () => {
          let toClose = []; for(let tab of tabs){ if(tab.index >= sharedNonSyncLength+sharedSyncLength) toClose.push(tab.id); }
          closeTabs(toClose, sharedNonSyncLength+sharedSyncLength+groupLength, page);
        });
      });
    }
  }

  document.getElementById("js-input-rename").value = group; // set group name into input
  if(isProtectedGroup){
    document.getElementById("js-tab-actions-delete").setAttribute('style', 'display: none;');
    document.getElementById("js-input-rename").setAttribute('style', 'pointer-events: none; cursor: default;');
    document.getElementById("js-tab-actions-rename").setAttribute('style', 'cursor: default;');
  }else{
    document.getElementById("js-tab-actions-delete").setAttribute('style', '');
    document.getElementById("js-input-rename").setAttribute('style', '');
    document.getElementById("js-tab-actions-rename").setAttribute('style', '');

    document.getElementById("js-tab-actions-delete").onmousedown = () => { // Delete group
      
      console.log("Deleting group " + group);
      if(localData.currentGroup == group){
        document.getElementById("mainTag").setAttribute('class', 'unswitched');
        loadGroup("Default", () => {
          let groupsTabs = syncData.groupsTabs;
          delete groupsTabs[group];
          browser.storage.sync.set({groupsTabs}).then(() => {
            reload();
          });
        });
      }else{
        let groupsTabs = syncData.groupsTabs;
        delete groupsTabs[group];
        browser.storage.sync.set({groupsTabs}).then(() => {
          document.getElementById("mainTag").setAttribute('class', 'unswitched');
          reload();
        });
      }
    }
    document.getElementById("js-input-rename").addEventListener('change', () => { // Update group name
      let name = document.getElementById("js-input-rename").value;
      if(lastGroup != group) return;

      let groupsTabs = syncData.groupsTabs;
      if(name != '' && groupsTabs[name] == undefined){
        groupsTabs[name] = groupsTabs[group];
        delete groupsTabs[group];
        if(localData.currentGroup == group){
          browser.storage.local.set({currentGroup: name}).then(() => {
            browser.storage.local.get().then((data) => {
              localData = data;
            });
          });
        }
        console.log("Renaming group " + group + " to " + name);
        group = name;
        lastGroup = name;
        browser.storage.sync.set({groupsTabs}).then(() => {
          browser.storage.sync.get().then((data) => {
            syncData = data;
            reload();
          });
        });
        
      }

    });
  }
  document.getElementById("mainTag").setAttribute('class', 'switched');

}

// CLOSE FUNCTIONS

function reorganizeAndUpdateGroup(groupTabs, groupType, groupName, groupData, callBack){
  console.log("Clearing group " + lastGroup);

  let newGroupTabs = {}; let tabsCount = Object.keys(groupTabs).length; let i = 0; let newI = 0;
  while(tabsCount > 0){
    if(groupTabs[i] != undefined){
      newGroupTabs[newI] = groupTabs[i];
      tabsCount--; newI++;
    }
    i++;
  }
  groupTabs = newGroupTabs;

  if(groupType == GROUP_COMMON_NO_SYNC) browser.storage.local.set({sharedNonSyncTabs: groupTabs}).then(() => {
    reload();
    if(localData.currentGroup == lastGroup || lastGroupType == GROUP_COMMON_SYNC || lastGroupType == GROUP_COMMON_NO_SYNC) callBack();
  });
  if(groupType == GROUP_COMMON_SYNC) browser.storage.sync.set({sharedSyncTabs: groupTabs}).then(() => {
    reload();
    if(localData.currentGroup == lastGroup || lastGroupType == GROUP_COMMON_SYNC || lastGroupType == GROUP_COMMON_NO_SYNC) callBack();
  });
  if(groupType == GROUP_NORMAL){
    groupData[groupName] = groupTabs; browser.storage.sync.set({groupsTabs: groupData}).then(() => {
      reload();
      if(localData.currentGroup == lastGroup || lastGroupType == GROUP_COMMON_SYNC || lastGroupType == GROUP_COMMON_NO_SYNC) callBack();
    });
  } 

}
function getCloseVars(callBack, tabIndex, previousGroups){
  browser.runtime.getBackgroundPage().then((page) => {
    page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
      if(tabIndex != null){
        if(previousGroups >= 1) tabIndex += sharedNonSyncLength;
        if(previousGroups >= 2) tabIndex += sharedSyncLength;
        browser.tabs.query({windowId: localData.supportedWindowId, index: tabIndex}).then((tabs) => {
          callBack(page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs);
        });
      }else{
        browser.tabs.query({windowId: localData.supportedWindowId}).then((tabs) => {
          callBack(page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs);
        });
      }
    });
  });
}
function closeTabs(tabIds, groupsLength, page){
  console.log("Clearing tabs of group " + lastGroup);
  page.activateListeners = false;
  if(groupsLength <= tabIds.length){
    browser.tabs.create({}).then(() => {
      browser.tabs.remove(tabIds).then(() => {
        setTimeout(function() {
          page.activateListeners = true;
          page.updateAllSavedTabs();
        }, 1000);
        reload();
      });
    });
  }else{
    browser.tabs.remove(tabIds).then(() => {
      setTimeout(function() {
          page.activateListeners = true;
          page.updateAllSavedTabs();
        }, 1000);
      reload();
    });
  }
}

// CHANGE GROUP & ADD TO GROUP FUNCTION

function loadGroup(group, callBack){
  console.log("Loading group " + group + "...");
  browser.runtime.getBackgroundPage().then((page) => {
    showLoader();
    page.activateListeners = false;
    browser.storage.local.get().then((localData) => {
      browser.storage.sync.get().then((syncData) => {

        browser.tabs.query({windowId: localData.supportedWindowId}).then((tabs) => { // Get tabs
          let tabsArray = [];
          let i = Object.keys(localData.sharedNonSyncTabs).length + Object.keys(syncData.sharedSyncTabs).length;
          for(let tab of tabs){
            if(tab.index >= i) tabsArray.push(tab.id);
          }

          
          for(let tabInfo of Object.values(syncData.groupsTabs[group])){
            browser.tabs.create({url: tabInfo.url, pinned: tabInfo.pinned, windowId: localData.supportedWindowId, index: i}).then(() => {}, (error) => {
              browser.tabs.create({windowId: localData.supportedWindowId}).then(() => {});
            });
            i++;
          }
          if(i == 0){
            browser.tabs.create({windowId: localData.supportedWindowId}).then(() => {});
          }

          setTimeout(() => {
            browser.tabs.remove(tabsArray).then(() => {
              browser.storage.local.set({currentGroup: group}).then(() => {
                page.activateListeners = true;
                page.updateAllSavedTabs();
                reload();
                callBack();
              });
            });
          }, 1000);

        });

        browser.browserAction.setBadgeText({text: group.toUpperCase(), windowId: localData.supportedWindowId});

      }, (error) => { console.log(error); });
    }, (error) => { console.log(error); });
  });
}

function addToGroup(group, tabs){
  

  if(group == localData.currentGroup){
    for(let tab of tabs){
      browser.tabs.create({url: tab.url, pinned: tab.pinned, windowId: localData.supportedWindowId}).then(() => {});
    }
  }else{
    let groupsTabs = syncData.groupsTabs;
    let groupTabs = groupsTabs[group];
    let groupLength = Object.keys(groupTabs).length;

    for(let tab of tabs){
      groupTabs[groupLength] = {
        title: tab.title,
        url: tab.url,
        pinned: tab.pinned
      }
      groupLength++;
    }

    browser.storage.sync.set({groupsTabs}).then(() => {
      reload();
    });

  }

  
}

function moveTabsAutoMenu(tabs, mouseX){

  document.getElementById("js-contextmenu").innerHTML = '';
  for(let groupName of Object.keys(syncData.groupsTabs)){
    if(groupName == localData.currentGroup && currentWindowId == localData.supportedWindowId) continue;
    document.getElementById("js-contextmenu").innerHTML += '<p id="js-contextmenu-group-' + groupName + '">' + groupName + '</p>';
  }
  for(let groupName of Object.keys(syncData.groupsTabs)){
    if(groupName == localData.currentGroup && currentWindowId == localData.supportedWindowId) continue;
    document.getElementById('js-contextmenu-group-' + groupName).onmousedown = (e) => { // CLICKING ON A GROUP
      addToGroup(groupName, tabs);
      document.getElementById("js-overlay").setAttribute('style', '');
      document.getElementById("js-contextmenu").setAttribute('style', '');
    }
    document.getElementById('js-overlay').onmousedown = (e) => { // CLICKING ON OVERLAY
      document.getElementById("js-overlay").setAttribute('style', '');
      document.getElementById("js-contextmenu").setAttribute('style', '');
    }
  }

  document.getElementById("js-overlay").setAttribute('style', 'display: block;');
  document.getElementById("js-contextmenu").setAttribute('style', 'display: block; left: ' + mouseX + 'px;');

  let width = document.getElementById('js-contextmenu').offsetWidth;
  if(mouseX + width >= 380) mouseX = 380 - width;

  document.getElementById("js-contextmenu").setAttribute('style', 'display: block; left: ' + mouseX + 'px;');
}

// OTHERS FUNCTIONS

function editListsSizes(page, localData, syncData, sharedNonSync, sharedSync){
  let sharedSyncTabs = syncData.sharedSyncTabs;
  let sharedSyncLength = Object.keys(sharedSyncTabs).length;
  let sharedNonSyncTabs = localData.sharedNonSyncTabs;
  let sharedNonSyncLength = Object.keys(sharedNonSyncTabs).length;

  if(sharedNonSync != 0){
    if(sharedNonSync < 0){
      delete sharedNonSyncTabs[(sharedNonSyncLength-1)+''];
    }else{
      sharedNonSyncTabs[sharedNonSyncLength+''] = {};
    }
    browser.storage.local.set({sharedNonSyncTabs}).then(() => {
      page.forceUpdateAllSavedTabs(() => {

        if(sharedSync != 0){
          if(sharedSync < 0){
            delete sharedSyncTabs[(sharedSyncLength-1)+''];
          }else{
            sharedSyncTabs[sharedSyncLength+''] = {};
          }
          browser.storage.sync.set({sharedSyncTabs}).then(() => {
          page.forceUpdateAllSavedTabs(() => {
              reload();
            });
          });
        }else reload();

      });
    });
  }else if(sharedSync != 0){

    if(sharedSync < 0){
      delete sharedSyncTabs[(sharedSyncLength-1)+''];
    }else{
      sharedSyncTabs[sharedSyncLength+''] = {};
    }
    browser.storage.sync.set({sharedSyncTabs}).then(() => {
    page.forceUpdateAllSavedTabs(() => {
        reload();
      });
    });

  }
}

function hideLoader(){
  document.getElementById("js-page-loader").setAttribute('style', 'display: none;');
}
function showLoader(){
  document.getElementById("js-page-loader").setAttribute('style', 'display: absolute;');
}
function reload(){
  browser.storage.sync.get().then((newSyncData) => {
    browser.storage.local.get().then((newLocalData) => {
      browser.tabs.query({active: true, windowId: currentWindowId}).then((currentTabs) => {
        currentTab = currentTabs[0];
        localData = newLocalData;
        syncData = newSyncData;
        updateGroupsListPanel();
        if(document.getElementById("mainTag").getAttribute('class') === 'switched'){
          updateGroupDetailsPanel(lastGroup, lastGroupType, lastIsProtectedGroup);
        }
      });
    });
  });
}
function reloadAll(group, groupType, isProtectedGroup){
  browser.storage.sync.get().then((newSyncData) => {
    browser.storage.local.get().then((newLocalData) => {
      browser.tabs.query({active: true, windowId: currentWindowId}).then((currentTabs) => {
        currentTab = currentTabs[0];
        localData = newLocalData;
        syncData = newSyncData;
        updateGroupsListPanel();
        updateGroupDetailsPanel(group, groupType, isProtectedGroup);
      });
    });
  });
  //window.location.href = window.location.pathname + window.location.search + window.location.hash;
}

function listTabs(tabs){
  let tabsText = "";
  Object.keys(tabs).forEach((tabIndex) => {(tabs[tabIndex] != undefined) ? (tabsText += tabIndex + " - " + tabs[tabIndex].title + "\n") : (tabsText += tabIndex + " - undefined" + "\n")});
  if(tabsText == "") tabsText = "Empty";
  return tabsText;
}

reload();