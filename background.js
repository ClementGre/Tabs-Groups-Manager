
const BOOKMARK_PREFIX = "tabsmanager.tab.id=";
const BOOKMARKS_FOLDER_TITLE = "Opened Tabs (Tabs Manager)";

//// SETUP BOOKMARK FOLDER ////

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

//// BOOKMARK FUNCTIONS ////

var saveTab = function saveTab(tab){
  browser.bookmarks.create({ // Create Bookmark
    title: BOOKMARK_PREFIX + tab.id,
    url: tab.url,
    type: "bookmark",
    parentId: BOOKMARKS_FOLDER_ID
  }).then((node) => {
    console.log("Tab saved :");
    console.log(node);
  });
}
var updateTab = function updateTab(tab){
  browser.bookmarks.search({title: BOOKMARK_PREFIX + tab.id}).then((bookmarkItems) => { // Search Bookmark

    console.log("Matches bookmarks :");
    console.log(bookmarkItems);

    if(bookmarkItems.length === 0){ // Bookmark does not exist -> Save it
      saveTab(tab);
    }else{ // Bookmark exist
      browser.bookmarks.update(bookmarkItems[0].id, { // Update tab URL
        url: tab.url,
      }).then((node) => {
        console.log("Tab updated :");
        console.log(node);
      });
    }
  }, (error) => {});
}
var removeTab = function removeTab(tabId){
  browser.bookmarks.search({title: BOOKMARK_PREFIX + tabId}).then((bookmarkItems) => { // Search Bookmark
    
    if(bookmarkItems.length !== 0){ // Bookmark exist

      browser.bookmarks.remove(bookmarkItems[0].id).then(() => { // Delete the Bookmark
        console.log("Tab removed !");
      }, (error) => {});
    }
  }, (error) => {});
}

//// TABS LISTENERS ////

browser.tabs.onRemoved.addListener((tabId, removeInfo) => { // Remove Tab
  removeTab(tabId);
});
browser.tabs.onCreated.addListener((tab) => { // Create Tab
  saveTab(tab);
});
browser.tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => { // Update Tab
  if(changeInfo.url){
    console.log(tabInfo);
    updateTab(tabInfo);
  }
});


