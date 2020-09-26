
const BOOKMARK_PREFIX = "Tab number ";
const BOOKMARKS_FOLDER_TITLE = "Opened Tabs (Tabs Manager)";

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
  browser.bookmarks.update(bookmark.id, { // Update tab URL
      url: tab.url
    }).then((node) => {
      console.log("Bookmark number " + tab.index + " updated !");
      tabsProcess = arrayRemove(tabsProcess, tab.id);
    });
}

// Update or create only one bookmark (call addBookmark or updateBookmark)
var addOrUpdateBookmark = function addOrUpdateBookmark(tab){
  if(tabsProcess.includes(tab.id)) return;
  tabsProcess.push(tab.id);

  browser.bookmarks.search({title: BOOKMARK_PREFIX + tab.index}).then((bookmarkItems) => { // Search Bookmark
    if(bookmarkItems.length === 0){ // Bookmark does not exist -> Save it
      addBookmark(tab);
    }else{ // Bookmark exist
      updateBookmark(tab, bookmarkItems[0]);
    }
  }, (error) => { tabsProcess = arrayRemove(tabsProcess, tab.id); });
}

// Iterate into tabs and update/create bookmarks for all pages
// After that, remove others unused bookmarks with deleteNextsBookmarks
var updateAllBookmarks = function updateAllBookmarks(){

  browser.tabs.query({}).then((tabs) => {

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
  setTimeout(() => {
    updateAllBookmarks();
  }, 2000);
});
browser.tabs.onDetached.addListener((tabId, detachInfo) => { // Remove Tab from this Window
  updateAllBookmarks();
});
browser.tabs.onCreated.addListener((tab) => { // Create Tab
  updateAllBookmarks();
});
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { // Update Tab
  if(changeInfo.url){
    addOrUpdateBookmark(tab);
  }
});
browser.tabs.onMoved.addListener((tabId, moveInfo) => { // Move Tab
  updateAllBookmarks();
});

/////////////////
///// UTILS /////
/////////////////

function arrayRemove(arr, value) {
  return arr.filter(function(ele){
    return ele != value;
  });
}



