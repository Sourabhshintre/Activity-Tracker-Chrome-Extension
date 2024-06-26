chrome.tabs.onCreated.addListener((tab) => {
	let tabMap = {};
	const time = new Date().getTime();
	tabMap[tab.id] = {
		id: tab.id,
		startTime: time,
		endTime: null,
		title: tab.title,
		url: tab.url,
		active: tab.active,
		timeSpentInSec: 0,
		tabTracker: []
	}
	chrome.storage.local.set(tabMap)
});

chrome.tabs.onActivated.addListener((activeInfo) => {
	const tabIdString = `${activeInfo.tabId}`;
	const currentTime = new Date().getTime();
	chrome.storage.local.get(tabIdString)
	.then(result => {
		result[tabIdString]['active'] = true;
		chrome.storage.local.set(result);
		if(result[tabIdString]['tabTracker'].length === 0){
			return;
		}
		const lastTabIndex = result[tabIdString]['tabTracker'].length - 1;
		result[tabIdString]['tabTracker'][lastTabIndex]['userStartTime'] = currentTime;
		result[tabIdString]['tabTracker'][lastTabIndex]['userEndTime'] = null;
		chrome.storage.local.set(result);
	})
	.catch(error => console.log(error));
	updateOtherTabs(tabIdString, currentTime);
});

const updateOtherTabs = (activeTabId, currentTime) => {
	chrome.storage.local.get().then((result) => {
		if (!result){
			return;
		}
		for (const tabId in result) {
			if (tabId === activeTabId){
				continue;
			}

			if (!result[tabId]['active']){
				continue;
			}

			chrome.tabs.get(parseInt(tabId))
			.then( chromeTab => {
				let tabMap = {};
				tabMap[tabId] = result[tabId];
				tabMap[tabId]['active'] = chromeTab.active;
				chrome.storage.local.set(tabMap);

				if(tabMap[tabId]['tabTracker'].length === 0){
					return;
				}
				const lastTabIndex = tabMap[tabId]['tabTracker'].length - 1;
				const userStartTime = tabMap[tabId]['tabTracker'][lastTabIndex]['userStartTime'];
				const userEndTime = tabMap[tabId]['tabTracker'][lastTabIndex]['userEndTime'];
				if(userEndTime){
					return;
				}
				const timeSpentInSec = (currentTime - userStartTime)/1000;
				tabMap[tabId]['tabTracker'][lastTabIndex]['userEndTime'] = currentTime;
				tabMap[tabId]['tabTracker'][lastTabIndex]['timeSpentInSec'] += timeSpentInSec;
				tabMap[tabId]['timeSpentInSec'] += timeSpentInSec;
				chrome.storage.local.set(tabMap);
			})
			.catch(error => console.log(error));
		}
	});
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	const tabIdString = `${tabId}`;
	if(changeInfo.status !== 'complete'){
		return;
	}
	chrome.storage.local.get(tabIdString)
	.then(result => {
		result[tabIdString]['title'] = tab.title;
		result[tabIdString]['url'] = tab.url;
		result[tabIdString]['active'] = tab.active;
		const currentTime = new Date().getTime();

		// Update the last tabTracker
		if(result[tabIdString]['tabTracker'].length > 0){
			const lastTabIndex = result[tabIdString]['tabTracker'].length - 1;
			// Skip if the current tab url is same as the last tabTracker url
			if(result[tabIdString]['tabTracker'][lastTabIndex]['url'] === tab.url){
				return;
			}
			const startTime = result[tabIdString]['tabTracker'][lastTabIndex]['startTime'];
			const userStartTime = result[tabIdString]['tabTracker'][lastTabIndex]['userStartTime'];
			const timeDiffInSec = (currentTime - startTime)/1000;
			const timeSpentInSec = (currentTime - userStartTime)/1000;
			result[tabIdString]['tabTracker'][lastTabIndex]['endTime'] = currentTime;
			result[tabIdString]['tabTracker'][lastTabIndex]['userEndTime'] = currentTime;
			result[tabIdString]['tabTracker'][lastTabIndex]['timeSpentInSec'] += timeSpentInSec;
			result[tabIdString]['tabTracker'][lastTabIndex]['timeDiffInSec'] = timeDiffInSec;
			result[tabIdString]['timeSpentInSec'] += timeSpentInSec;
		}

		// Add a new tabTracker
		result[tabIdString]['tabTracker'].push({
			startTime: currentTime,
			endTime: null,
			...(tab.active ? {userStartTime: currentTime}: {userStartTime: null}),
			userEndTime: null,
			timeSpentInSec: 0,
			title: tab.title,
			url: tab.url
		});
		chrome.storage.local.set(result);
	})
	.catch(error => console.log(error));
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
	const tabIdString = `${tabId}`;
	chrome.storage.local.get(tabIdString).then(result => {
		if (!result){
			return;
		}
		let tabMap = {};
		tabMap[tabId] = result[tabIdString]
		const currentTime = new Date().getTime();
		const wasTabActive = result[tabIdString]['active'];
		tabMap[tabId]['endTime'] = currentTime;
		tabMap[tabId]['active'] = false;
		chrome.storage.local.set(tabMap);

		// Updating the last tabTracker
		const tabTracker = result[tabIdString]['tabTracker']
		if(tabTracker.length === 0){
			return;
		}
		if(tabTracker.length > 0){
			const lastTabIndex = tabTracker.length - 1;
			const lastTabStartTime = tabTracker[lastTabIndex]['startTime'];
			tabMap[tabId]['tabTracker'][lastTabIndex]['endTime'] = currentTime;
			const timeDiffInSec = (currentTime - lastTabStartTime)/1000;
			tabMap[tabId]['tabTracker'][lastTabIndex]['timeDiffInSec'] = timeDiffInSec;

			const lastTabUserStartTime = tabTracker[lastTabIndex]['userStartTime'];
			const lastTabUserEndTime = tabTracker[lastTabIndex]['userEndTime'];
			tabMap[tabId]['tabTracker'][lastTabIndex]['userEndTime'] = wasTabActive ? currentTime : lastTabUserEndTime;
			const timeSpentInSec = (tabMap[tabId]['tabTracker'][lastTabIndex]['userEndTime'] - lastTabUserStartTime)/1000;
			tabMap[tabId]['tabTracker'][lastTabIndex]['timeSpentInSec'] += timeSpentInSec;
			tabMap[tabId]['timeSpentInSec'] += timeSpentInSec;
			chrome.storage.local.set(tabMap);
		}
	});
});

chrome.windows.onRemoved.addListener((windowId) => {
	chrome.storage.local.get().then((result) => {
		if (!result){
			return;
		}
		for (const tabId in result) {
			if (tabId.windowId !== windowId){
				continue;
			}
			const time = new Date().getTime();
			if (result[tabId]['endTime']){
				continue;
			}
			result[tabId]['endTime'] = time;
			result[tabId]['active'] = false;
			chrome.storage.local.set(result);
		}
	});
});
