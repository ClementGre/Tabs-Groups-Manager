const GROUP_COMMON_NO_SYNC = 1;
const GROUP_COMMON_SYNC = 2;

/********** ON TAB CLOSED **********/

browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => { // Remove Tab
    if(removeInfo.isWindowClosing) return;
    
    processTabRemoved(window.enableListeners, removeInfo.windowId, lastOpenedTabsIndexes[tabId]).then(() => {}).catch(e => {
        console.error("Error while processing tab removing (onRemoved): ", e)
    })
});

/********** ON TAB DETACHED **********/

browser.tabs.onDetached.addListener((tabId, detachInfo) => { // Remove Tab from this Window
    processTabRemoved(window.enableListeners, detachInfo.oldWindowId, detachInfo.oldPosition).then(() => {}).catch(e => {
        console.error("Error while processing tab removing (onDetached): ", e)
    })
});

/********** TAB REMOVED PROCESSOR **********/

async function processTabRemoved(wereListenersEnabled, windowId, tabIndex){
    const localData = await getLocalData()
    
    if(localData.supportedWindowId !== windowId) return;
    await updateOpenedTabsIndexesMapping();
    if(!wereListenersEnabled) return;
    
    const tabInfo = await searchSavedTab(localData.currentGroup, tabIndex);
    if(tabInfo.group === GROUP_COMMON_NO_SYNC){
        await editGroupListSize(localData, tabInfo.group, false)
    }else if(tabInfo.group === GROUP_COMMON_SYNC){
        await editGroupListSize(await window.getSyncData(), tabInfo.group, false)
    }else{
        await updateAllSavedTabs();
    }
}

/********** ON TAB CREATED **********/

browser.tabs.onCreated.addListener((tab) => {
    let wereListenersEnabled = window.enableListeners;
    
    window.getLocalData().then(async (data) => { // Get supported Window Id
        if(data.supportedWindowId === tab.windowId){ // Update only if we are in the supported window
            await updateOpenedTabsIndexesMapping();
            if(!wereListenersEnabled) return;
            await updateAllSavedTabs();
        }
    }, e => {
        console.error("Error while processing tab created (onCreated): ", e);
    });
});

/********** ON TAB UPDATED **********/

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    const wereListenersEnabled = window.enableListeners;
    if(!wereListenersEnabled) return;
    if(changeInfo.url !== undefined || changeInfo.title !== undefined || changeInfo.pinned !== undefined){ // Update only if the URL has changed
        
        const localData = await window.getLocalData();
        if(localData.supportedWindowId !== tab.windowId) return;
        
        if(changeInfo.pinned === false){ // in case the tab became unpinned
            
            const tabInfo = await searchSavedTab(localData.currentGroup, tab.index);
            if(tabInfo.group === GROUP_COMMON_NO_SYNC || tabInfo.group === GROUP_COMMON_SYNC){
                // If the moved tab is in a common group
                
                const lastTabInfo = await searchSavedTab(localData.currentGroup, lastOpenedTabsIndexes[tab.id]);
                if(lastTabInfo.group === GROUP_COMMON_NO_SYNC){
                    await editGroupListSize(localData, lastTabInfo.group, false);
                }else{
                    const syncData = await getSyncData();
                    await editGroupListSize(syncData, lastTabInfo.group, false);
                }
                await browser.tabs.executeScript({code : 'alert("The Common tabs have to stay pinned, this tab is not anymore a Common tab.")'});
                
            }else saveOrUpdateSavedTabByTab(tab);
        }else saveOrUpdateSavedTabByTab(tab);
    }
});

/********** ON TAB MOVED **********/

browser.tabs.onMoved.addListener(async (tabId, moveInfo) => {
    let wereListenersEnabled = enableListeners;
    await updateOpenedTabsIndexesMapping();
    if(!wereListenersEnabled){
        console.log("Listeners are disabled, onMove event ignored"); return;
    }
    
    const localData = await window.getLocalData();
    if(localData.supportedWindowId !== moveInfo.windowId) return;
    
    countListsLengths(async (sharedNonSyncLength, sharedSyncLength) => {
        
        const tabInfo = await searchSavedTab(localData.currentGroup, moveInfo.fromIndex);
        if(!window.enableListeners) return;
        
        if(tabInfo.group === GROUP_COMMON_NO_SYNC){
            if(moveInfo.toIndex >= sharedNonSyncLength){
                window.enableListeners = false;
                browser.tabs.move([tabId], {index: sharedNonSyncLength-1}).then(() => {
                    window.enableListeners = true;
                    browser.tabs.executeScript({code : 'alert("The No Synced Common tabs can\'t be after the Synced Common tabs")'});
                }, (error) => { console.log(error); window.enableListeners = true; });
                return;
            }
        }else if(tabInfo.group === GROUP_COMMON_SYNC){
            if(moveInfo.toIndex >= (sharedNonSyncLength + sharedSyncLength)){
                window.enableListeners = false;
                browser.tabs.move([tabId], {index: sharedNonSyncLength+sharedSyncLength-1}).then(() => {
                    window.enableListeners = true;
                    browser.tabs.executeScript({code : 'alert("The Common tabs can\'t be after the Group tabs")'});
                }, (error) => { console.log(error); window.enableListeners = true; });
                return;
            }else if(moveInfo.toIndex < sharedNonSyncLength){
                window.enableListeners = false;
                browser.tabs.move([tabId], {index: sharedNonSyncLength}).then(() => {
                    window.enableListeners = true;
                    browser.tabs.executeScript({code : 'alert("The Synced Common tabs can\'t be before the No Synced Common tabs")'});
                }, (error) => { console.log(error); window.enableListeners = true; });
                return;
            }
        }else{
            if(moveInfo.toIndex < (sharedNonSyncLength + sharedSyncLength)){
                window.enableListeners = false;
                browser.tabs.move([tabId], {index: sharedNonSyncLength+sharedSyncLength}).then(() => {
                    window.enableListeners = true;
                    browser.tabs.executeScript({code : 'alert("The Group tabs can\'t be before the Common tabs")'});
                }, (error) => { console.log(error); window.enableListeners = true; });
                return;
            }
        }
        updateAllSavedTabs();
    });
});