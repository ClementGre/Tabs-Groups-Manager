async function restore(){
    console.log("Restoring last session...");

    let localData = await browser.storage.local.get();
    let syncData = await browser.storage.sync.get();
    console.log("WinowId: ", localData.supportedWindowId)

    // Get current tabs
    let tabs = await browser.tabs.query({windowId: localData.supportedWindowId});
    let tabsId = [];
    for(let tab of tabs) tabsId.push(tab.id);

    // Get to load tabs
    let tabsToLoad = getSharedNonSyncTabs(localData, localData.supportedWindowId);
    tabsToLoad.push(...getSharedSyncTabs(syncData, localData.supportedWindowId));
    tabsToLoad.push(...await getCurrentGroupTabs(localData, syncData, localData.supportedWindowId));

    // Check if tabs aren't already loaded
    let needToLoadTabs = false;
    if(tabs.length < tabsToLoad.length){
        needToLoadTabs = true;
    }else {
        for(let i = 0; i < tabsToLoad.length; i++){
            if(tabsToLoad[i].url !== tabs[i].url) needToLoadTabs = true;
        }
    }

    if(needToLoadTabs){
        window.activateListeners = false;

        // In case at least one tab has to open
        for(let i = 0; i < tabsToLoad.length; i++){
            try{
                await browser.tabs.create(tabsToLoad[i]);
            }catch (e){
                await browser.tabs.create({pinned: tabsToLoad[i].pinned, windowId: tabsToLoad[i].windowId});
            }
            if(i === 0) await browser.tabs.remove(tabsId); // Close other tabs after the first one opened
        }

        if(tabsToLoad.length === 0){ // In case no tab were loaded
            await browser.tabs.create({windowId: localData.supportedWindowId});
            await browser.tabs.remove(tabsId); // Close other tabs
        }

        console.log("Loaded ", tabsToLoad.length, " tabs");
        await browser.browserAction.setBadgeText({text: localData.currentGroup.toUpperCase(), windowId: localData.supportedWindowId});

        window.activateListeners = true;
    }else{
        console.log("Tabs already loaded")
    }
    window.updateAllSavedTabs();

}
export {restore};



function getSharedNonSyncTabs(localData, windowId){
    let tabs = [];
    for(let tab of Object.values(localData.sharedNonSyncTabs)){
        tabs.push({url: tab.url, pinned: true, windowId: windowId/*, index: i*/});
    }
    return tabs;
}

function getSharedSyncTabs(syncData, windowId){
    let tabs = [];
    for(let tab of Object.values(syncData.sharedSyncTabs)){
        tabs.push({url: tab.url, pinned: true, windowId: windowId/*, index: i*/})
    }
    return tabs;
}

async function getCurrentGroupTabs(localData, syncData, windowId){
    // Get current group
    let currentGroup = syncData.groupsTabs[localData.currentGroup];
    if(currentGroup === undefined){
        currentGroup = syncData.groupsTabs[Object.keys(syncData.groupsTabs)[0]];
        try{
            await browser.storage.local.set({currentGroup: currentGroup});
        }catch(e){
            console.error(e)
        }
    }

    let tabs = [];
    for(let tab of Object.values(currentGroup)){
        tabs.push({url: tab.url, pinned: tab.pinned, windowId: windowId/*, index: i*/});
    }
    return tabs;
}