
const BOOKMARK_PREFIX = "Tab number ";
const BOOKMARKS_FOLDER_TITLE = "Opened Tabs (Tabs Manager)";

browser.windows.getAll({windowTypes: ["normal"]}).then((windows) => {
  browser.storage.local.set({
    supportedWindowId: windows[0].id
  }).then(() => {}, (error) => { console.log(error); });
});

var tabsProcess = []; // Prevent repeating events system

var groupsTabs = {
    "default": {
      "0": {
        url: "http://google.com/",
        title: "Google",
        pined: true
      },
      "1": {
        url: "http://google.com/",
        title: "Google",
        pined: false
      }
    },
    "work": {
      "0": {
        url: "http://google.com/",
        title: "Google",
        pined: false
      },
      "1": {
        url: "http://google.com/",
        title: "Google",
        pined: false
      }
    }
  }
var sharedSyncTabs = {
    "0": {
      url: "http://google.com/",
      title: "Google"
    },
    "1": {
      url: "http://google.com/",
      title: "Google"
    }
  }
var sharedNonSyncTabs = {
    "0": {
      url: "https://pdf4teachers.org/",
      title: "PDF4Teachers"
    },
    "1": {
      url: "http://google.com/",
      title: "Google"
    }
  }

browser.storage.local.set({
  sharedNonSyncTabs
}).then(() => {}, (error) => { console.log(error); });
browser.storage.sync.set({
  groupsTabs, sharedSyncTabs    
}).then(() => {}, (error) => { console.log(error); });

/////////////////////////////////
///// SETUP BOOKMARK FOLDER /////
/////////////////////////////////

var BOOKMARKS_FOLDER_ID;
browser.bookmarks.search({title: BOOKMARKS_FOLDER_TITLE}).then((bookmarkItems) => { // FIND BOOKMARK FOLDER
    
    if(bookmarkItems.length === 0){ // Folder does not exist

      browser.bookmarks.create({ // Create folder
        title: BOOKMARKS_FOLDER_TITLE,
        type: "folder"
      }).then((node) => {
        BOOKMARKS_FOLDER_ID = node.id; // Save folder ID
      });

    }else{ // Folder exist
      BOOKMARKS_FOLDER_ID = bookmarkItems[0].id; // Save folder ID
    }
  }, (error) => {});

//////////////////////////////
///// BOOKMARK FUNCTIONS /////
//////////////////////////////

// Create new bookmark
var addBookmark = function addBookmark(tab){
  if(tabsProcess.includes(tab.id)) return;
  tabsProcess.push(tab.id);
  browser.bookmarks.create({ // Create Bookmark
    title: BOOKMARK_PREFIX + tab.index,
    index: 0,
    url: tab.url,
    type: "bookmark",
    parentId: BOOKMARKS_FOLDER_ID
  }).then((node) => {
    console.log("Bookmark number " + tab.index + " saved !");
    tabsProcess = arrayRemove(tabsProcess, tab.id);
  });
}

// Update a bookmark url and flags
var updateBookmark = function updateBookmark(tab, bookmark){
  if(tabsProcess.includes(tab.id)) return;
  tabsProcess.push(tab.id);
  browser.bookmarks.update(bookmark.id, { // Update tab URL
      url: tab.url
    }).then((node) => {
      console.log("Bookmark number " + tab.index + " updated !");
      tabsProcess = arrayRemove(tabsProcess, tab.id);
    });
}

// Update or create only one bookmark (call addBookmark or updateBookmark)
var addOrUpdateBookmark = function addOrUpdateBookmark(tab){

  browser.bookmarks.search({title: BOOKMARK_PREFIX + tab.index}).then((bookmarkItems) => { // Search Bookmark
    if(bookmarkItems.length === 0){ // Bookmark does not exist -> Save it
      addBookmark(tab);
    }else{ // Bookmark exist
      updateBookmark(tab, bookmarkItems[0]);
    }
  }, (error) => { });
}

// Iterate into tabs and update/create bookmarks for all pages
// After that, remove others unused bookmarks with deleteNextsBookmarks
var updateAllBookmarks = function updateAllBookmarks(){

  browser.storage.local.get().then((data) => { // Get supported Window Id
    browser.tabs.query({windowId: data.supportedWindowId}).then((tabs) => { // get tabs of the supported window

      var index = 0;
      for(let tab of tabs){ // Iterate int tabs
        browser.bookmarks.search({title: BOOKMARK_PREFIX + index}).then((bookmarkItems) => { // Search Bookmark

          if(bookmarkItems.length === 0){ // Bookmark does not exist -> Create one
            addBookmark(tab);
          }else{ // Bookmark exist
            if(tab.url !== bookmarkItems[0].url){ // Bookmark have changed his URL : update URL
              updateBookmark(tab, bookmarkItems[0]);
            }
          }
        }, (error) => {});
        index++;

      }
      deleteNextsBookmarks(index); // Delete above bookmarks (Bookmarks without tab)
    });
  });
}
// Delete Bookmark by tab Index (by Bookmark name) and repeat this for all above bookmarks
var deleteNextsBookmarks = function deleteNextsBookmarks(index){
  browser.bookmarks.search({title: BOOKMARK_PREFIX + index}).then((bookmarkItems) => { // Search Bookmark

    if(bookmarkItems.length !== 0){ // Bookmark exist : delete it
      browser.bookmarks.remove(bookmarkItems[0].id).then((node) => {
        console.log("Bookmark number " + index + " was removed !");
        deleteNextsBookmarks(index+1); // Re-cal function with index+1 : next Bookmark
      });
    }
  }, (error) => {});
}

//////////////////////////
///// TABS LISTENERS /////
//////////////////////////

browser.tabs.onRemoved.addListener((tabId, removeInfo) => { // Remove Tab
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == removeInfo.windowId){ // Update only if we are in the supported window
      setTimeout(() => {
        updateAllBookmarks();
      }, 2000);
    }
  }, (error) => { console.log(error); });
});
browser.tabs.onDetached.addListener((tabId, detachInfo) => { // Remove Tab from this Window
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == detachInfo.windowId){ // Update only if we are in the supported window
      updateAllBookmarks();
    }
  }, (error) => { console.log(error); });
});
browser.tabs.onCreated.addListener((tab) => { // Create Tab
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == tab.windowId){ // Update only if we are in the supported window
      updateAllBookmarks();
    }
  }, (error) => { console.log(error); });
});
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { // Update Tab
  if(changeInfo.url){ // Update only if the URL was changed
    browser.storage.local.get().then((item) => { // Get supported Window Id
      if(item.supportedWindowId == tab.windowId){ // Update only if we are in the supported window
        addOrUpdateBookmark(tab);
      }
    }, (error) => { console.log(error); });
  }
});
browser.tabs.onMoved.addListener((tabId, moveInfo) => { // Move Tab
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == moveInfo.windowId){ // Update only if we are in the supported window
      setTimeout(() => {
        updateAllBookmarks();
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

/*
const BOOKMARK_PREFIX = "Tab number ";
const BOOKMARKS_FOLDER_TITLE = "Opened Tabs (Tabs Manager)";

browser.windows.getAll({windowTypes: ["normal"]}).then((windows) => {
  browser.storage.local.set({
    supportedWindowId: windows[0].id
  }).then(() => {}, (error) => { console.log(error); });
});

var tabsProcess = []; // Prevent repeating events system

/////////////////////////////////
///// SETUP BOOKMARK FOLDER /////
/////////////////////////////////

var BOOKMARKS_FOLDER_ID;
browser.bookmarks.search({title: BOOKMARKS_FOLDER_TITLE}).then((bookmarkItems) => { // FIND BOOKMARK FOLDER
    
    if(bookmarkItems.length === 0){ // Folder does not exist

      browser.bookmarks.create({ // Create folder
        title: BOOKMARKS_FOLDER_TITLE,
        type: "folder"
      }).then((node) => {
        BOOKMARKS_FOLDER_ID = node.id; // Save folder ID
      });

    }else{ // Folder exist
      BOOKMARKS_FOLDER_ID = bookmarkItems[0].id; // Save folder ID
    }
  }, (error) => {});

//////////////////////////////
///// BOOKMARK FUNCTIONS /////
//////////////////////////////

// Create new bookmark
var addBookmark = function addBookmark(tab){
  if(tabsProcess.includes(tab.id)) return;
  tabsProcess.push(tab.id);
  browser.bookmarks.create({ // Create Bookmark
    title: BOOKMARK_PREFIX + tab.index,
    index: 0,
    url: tab.url,
    type: "bookmark",
    parentId: BOOKMARKS_FOLDER_ID
  }).then((node) => {
    console.log("Bookmark number " + tab.index + " saved !");
    tabsProcess = arrayRemove(tabsProcess, tab.id);
  });
}

// Update a bookmark url and flags
var updateBookmark = function updateBookmark(tab, bookmark){
  if(tabsProcess.includes(tab.id)) return;
  tabsProcess.push(tab.id);
  browser.bookmarks.update(bookmark.id, { // Update tab URL
      url: tab.url
    }).then((node) => {
      console.log("Bookmark number " + tab.index + " updated !");
      tabsProcess = arrayRemove(tabsProcess, tab.id);
    });
}

// Update or create only one bookmark (call addBookmark or updateBookmark)
var addOrUpdateBookmark = function addOrUpdateBookmark(tab){

  browser.bookmarks.search({title: BOOKMARK_PREFIX + tab.index}).then((bookmarkItems) => { // Search Bookmark
    if(bookmarkItems.length === 0){ // Bookmark does not exist -> Save it
      addBookmark(tab);
    }else{ // Bookmark exist
      updateBookmark(tab, bookmarkItems[0]);
    }
  }, (error) => { });
}

// Iterate into tabs and update/create bookmarks for all pages
// After that, remove others unused bookmarks with deleteNextsBookmarks
var updateAllBookmarks = function updateAllBookmarks(){

  browser.storage.local.get().then((data) => { // Get supported Window Id
    browser.tabs.query({windowId: data.supportedWindowId}).then((tabs) => { // get tabs of the supported window

      var index = 0;
      for(let tab of tabs){ // Iterate int tabs
        browser.bookmarks.search({title: BOOKMARK_PREFIX + index}).then((bookmarkItems) => { // Search Bookmark

          if(bookmarkItems.length === 0){ // Bookmark does not exist -> Create one
            addBookmark(tab);
          }else{ // Bookmark exist
            if(tab.url !== bookmarkItems[0].url){ // Bookmark have changed his URL : update URL
              updateBookmark(tab, bookmarkItems[0]);
            }
          }
        }, (error) => {});
        index++;

      }
      deleteNextsBookmarks(index); // Delete above bookmarks (Bookmarks without tab)
    });
  });
}
// Delete Bookmark by tab Index (by Bookmark name) and repeat this for all above bookmarks
var deleteNextsBookmarks = function deleteNextsBookmarks(index){
  browser.bookmarks.search({title: BOOKMARK_PREFIX + index}).then((bookmarkItems) => { // Search Bookmark

    if(bookmarkItems.length !== 0){ // Bookmark exist : delete it
      browser.bookmarks.remove(bookmarkItems[0].id).then((node) => {
        console.log("Bookmark number " + index + " was removed !");
        deleteNextsBookmarks(index+1); // Re-cal function with index+1 : next Bookmark
      });
    }
  }, (error) => {});
}

//////////////////////////
///// TABS LISTENERS /////
//////////////////////////

browser.tabs.onRemoved.addListener((tabId, removeInfo) => { // Remove Tab
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == removeInfo.windowId){ // Update only if we are in the supported window
      setTimeout(() => {
        updateAllBookmarks();
      }, 2000);
    }
  }, (error) => { console.log(error); });
});
browser.tabs.onDetached.addListener((tabId, detachInfo) => { // Remove Tab from this Window
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == detachInfo.windowId){ // Update only if we are in the supported window
      updateAllBookmarks();
    }
  }, (error) => { console.log(error); });
});
browser.tabs.onCreated.addListener((tab) => { // Create Tab
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == tab.windowId){ // Update only if we are in the supported window
      updateAllBookmarks();
    }
  }, (error) => { console.log(error); });
});
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { // Update Tab
  if(changeInfo.url){ // Update only if the URL was changed
    browser.storage.local.get().then((item) => { // Get supported Window Id
      if(item.supportedWindowId == tab.windowId){ // Update only if we are in the supported window
        addOrUpdateBookmark(tab);
      }
    }, (error) => { console.log(error); });
  }
});
browser.tabs.onMoved.addListener((tabId, moveInfo) => { // Move Tab
  browser.storage.local.get().then((item) => { // Get supported Window Id
    if(item.supportedWindowId == moveInfo.windowId){ // Update only if we are in the supported window
      setTimeout(() => {
        updateAllBookmarks();
      }, 2000);
    }
  }, (error) => { console.log(error); });
});*/

