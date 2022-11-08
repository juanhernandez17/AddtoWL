// ==UserScript==
// @name            Add to Watch Later
// @description     Adds YT videos to watch later.
// @author          juanhernandez17
// @namespace       juanhernandez17
// @homepageURL     https://github.com/juanhernandez17/AddtoWL
// @icon            https://s.ytimg.com/yts/img/favicon_32-vflOogEID.png
// @version         0.1
// @match         	http*://www.youtube.com/*
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_addStyle
// @grant           GM_getValue
// @grant           GM_setValue
// ==/UserScript==

/*----- Settings -----*/

//===== button names =====//
const channelButton = "myChannelButton"; // add to watch later button in channel/videos
const removeWLButton = "myRemoveWLButton"; // remove all button in WL playlist
const settingsButton = "mySettingsButton" // settings button in YT Header
const todayButton = "myTodayButton" // add to watch later button in subscriptions/feed today header
const yesterdayButton = "myYesterdayButton" // add to watch later button in subscriptions/feed today header
const playlistButton = "myPlaylistButton" // add to watch later button in playlist
const addWatched = "addWatched"
const stopWatched = "stopWatched"
const addShorts = "addShorts"

function fields(){
    const buttons = [channelButton,todayButton,yesterdayButton,playlistButton]
    var field = {}
    var opts = {
        addWatched: // This is the id of the field
        {
            'section':['WL'],
            'label': addWatched, // Appears next to field
            'type': 'checkbox', // Makes this setting a text field
            'default': false // Default value if user doesn't change it
        },
        // stop adding at last watched video
        stopWatched: // This is the id of the field
        {
            'label': stopWatched, // Appears next to field
            'type': 'checkbox', // Makes this setting a text field
            'default': true // Default value if user doesn't change it
        },
        // add shorts to WL
        addShorts: // This is the id of the field
        {
            'label': addShorts, // Appears next to field
            'type': 'checkbox', // Makes this setting a text field
            'default': false // Default value if user doesn't change it
        },


    }
    buttons.forEach((btnname)=>{
        let tmpopts = false
        Object.keys(opts).forEach(function(key) {
            field[btnname+key] = {}
            Object.assign(field[btnname+key],opts[key])
            //field[btnname+key] = opts[key]
            if (!tmpopts){
                field[btnname+key].section = [btnname]
                tmpopts = true
            }

        });
    })
    //===== skip age =====//
    // should the age restricted button be pressed automatically
    field.pressAgeBTN = {
            'section':['AGE'],
            'label': 'pressAgeBTN', // Appears next to field
            'type': 'checkbox', // Makes this setting a text field
            'default': false // Default value if user doesn't change it
    }
    return field

}
/*globals GM_config*/
GM_config.init(
	{
		'id': 'MyConfig', // The id used for this instance of GM_config
		'title': 'SETTINGS for adding to Watch Later',
		'fields': fields()
	});


/*--- Code Start Here ---*/

// clicks confirm on age restricted video asks to play
function playARVideo() {
    let cevt = new MouseEvent("click", {
		bubbles: true,
		cancelable: true
	});
    let pl = document.getElementById('player')
	let arv = pl.getElementsByTagName("yt-playability-error-supported-renderers")[0]
	if (arv && arv.getAttribute("hidden") === null) {
        console.log('Skippin')
		//let wl = arv.getElementsByTagName('tp-yt-paper-button')[0]
		let wl = arv.getElementsByTagName('yt-button-renderer')[0].getElementsByTagName('Button')[0]
		if (wl) {
            setTimeout(() => {wl.click();console.log('Skipped')}, 3000)
			//wl.click()
		}
	}
}
// filters by id
function filtr(elements, idname) {
	return elements.filter(ol => ol.getAttribute('id') === idname)[0]
}

function addWL(video,btnname) {
	var fn = 0

	let evt = new MouseEvent("mouseenter", { // shows the thumbnail overlay
		bubbles: true,
		cancelable: true,

	});
	let levt = new MouseEvent("mouseleave", { // dismisses the thumbnail overlay
		bubbles: true,
		cancelable: true
	});
	let cevt = new MouseEvent("click", {
		bubbles: true,
		cancelable: true
	});
    let tagname = ''
	if (window.location.href.match('/(c|user|channel)\/.*\/video') !== null) {
		tagname = 'video-title-link'
	}
	else if (window.location.href.includes('feed/subscriptions')) {
		tagname = 'video-title'
    }


	let link = filtr(Array.from(video.getElementsByClassName('style-scope')), tagname).href
	let vdid = link.substring(link.indexOf('=') + 1)
	// way to check if video was watched but not finished
	//    if (link.match("&t=") !== null) {
	//      return
	//}
	if (video.getElementsByTagName('ytd-thumbnail-overlay-resume-playback-renderer').length !== 0 && !GM_config.get(btnname+addWatched)) { // if the video has been watched dont add it
		return 0
	}
    // may not need this anymore since youtube has created a separate tab for shorts
	if (link.includes("/shorts/") && !GM_config.get(btnname+addShorts)) { // if the video is a short dont add it
		return 0
	}
    let thumb = video.getElementsByTagName('ytd-thumbnail')[0]
    thumb.dispatchEvent(evt)
	// clicks the add to watch later button from the overlay
	let overlay = filtr(Array.from(video.getElementsByClassName('style-scope')), 'hover-overlays')
	if (overlay !== null) {
		let tag = filtr(Array.from(overlay.getElementsByClassName('style-scope')), 'label')
		if (tag !== null) {
			// this video needs to be added
			if (tag.textContent && tag.textContent.includes('Watch later')) {
				//tag.dispatchEvent(cevt)
				tag.click()
				fn += 1
			}

		}

	}
	thumb.dispatchEvent(levt)
	return fn
}

function doADDWL(btnname) {
	var final = 0
	var videos = null
	var zNode = document.getElementById(btnname);
	zNode.disabled = true
	if (window.location.href.match('/(c|user|channel)\/.*\/video') !== null) {
		videos = Array.from(window.document.getElementsByTagName('ytd-rich-grid-renderer')[0].getElementsByTagName('ytd-rich-item-renderer'))
	}
	else if (window.location.href.includes('feed/subscriptions')) {
		let cont = getParentByTagName(zNode, 'YTD-ITEM-SECTION-RENDERER')
		videos = Array.from(cont.getElementsByTagName('ytd-grid-video-renderer'))
	}
	else {
		alert("Cant Do That Here")
		return -1
	}
    let oldurl = window.location.href
	// let ch = window.prompt("How many vids to add? All, !Watched, <number>, <url> of last to add");
	// console.log(typeof(ch))
	var countd = videos.length
	var count = 0

	var x = setInterval(function () {
		// Display the result in the element with id="demo"
		zNode.innerHTML = 'Adding ' + (countd - count) + ' wait ' + ((countd - count) / 2) + ' Seconds';

		// If the count down is finished, write some text
		if ( oldurl !== window.location.href || countd === count || (videos[count].getElementsByTagName('ytd-thumbnail-overlay-resume-playback-renderer').length !== 0 && (GM_config.get(btnname+stopWatched) && !window.location.href.includes("feed/subscriptions")))) { // check if video was watched

			zNode.innerHTML = "Finished Adding " + final;
			setTimeout(() => {
				zNode.disabled = false
				zNode.innerHTML = "Add to Watch Later"
			}, 3000)
			clearInterval(x);
		}
		else { final += addWL(videos[count],btnname) }	// add to watch later
		count += 1

	}, 500);//wait .5seconds to do the next interation


}

function removeWL(video) {
	video.getElementsByTagName('button')[0].click()
	var lsts = Array.from(window.document.getElementsByTagName('tp-yt-paper-listbox'))
	var menu = lsts.filter(ls => ls.textContent.includes('Remove from'))[0]
	var menulist = Array.from(document.getElementsByTagName('ytd-menu-service-item-renderer'))
	var menuitemDel = menulist.filter(ls => ls.textContent.includes('Remove from'))[0]
	menuitemDel.click()
}

function doRWL(btnname) {
	if (!window.location.href.includes("/playlist?list=WL")) {
		alert("Cant Do That Here")
		return -1
	}
    if (!window.confirm("Are you sure you want to clear WL")) return -1
    let oldurl = window.location.href
	const videos = Array.from(window.document.getElementsByTagName('ytd-playlist-video-renderer'))
	var wa = 0
	var zNode = document.getElementById(btnname);
	zNode.disabled = true
	// let ch = window.prompt("How many vids to add? All, !Watched, <number>, <url> of last to add");
	// console.log(typeof(ch))
	var countd = videos.length
	var count = 0
	var x = setInterval(function () {
		// Display the result in the element with id="demo"
		zNode.innerHTML = 'Removing ' + (countd - count) + ' wait ' + ((countd - count) / 2) + ' Seconds';

		removeWL(videos[count]) // add to watch later
		count += 1
		// If the count down is finished, write some text
		//if (videos[count].getElementsByTagName('ytd-thumbnail-overlay-resume-playback-renderer').length !== 0 || countd === count ){
		if (countd === count||oldurl !== window.location.href) { // check if end of list
			zNode.innerHTML = "Finished Deleting " + count;
			setTimeout(() => {
				zNode.disabled = false
				zNode.innerHTML = "Remove All"
			}, 3000)
			clearInterval(x);
		}

	}, 500);//wait .5seconds to do the next interation
}

function addPLWL(video,btnname) {

	let link = filtr(Array.from(video.getElementsByClassName('style-scope')), 'video-title').href
	// way to check if video was watched but not finished
	//    if (link.match("&t=") !== null) {
	//      return
	//}
	if (video.getElementsByTagName('ytd-thumbnail-overlay-resume-playback-renderer').length !== 0 && !GM_config.get(btnname+addWatched)) { // if the video has been watched dont add it
		return 0
	}
	if (link.includes("/shorts/") && !GM_config.get(btnname+addShorts)) { // if the video is a short dont add it
		return 0
    }

	video.getElementsByTagName('button')[0].click()
	var lsts = Array.from(window.document.getElementsByTagName('tp-yt-paper-listbox'))
	var menu = lsts.filter(ls => ls.textContent.includes('Save to Watch later'))[0]
	var menulist = Array.from(menu.getElementsByTagName('ytd-menu-service-item-renderer'))
	var menuitemDel = menulist.filter(ls => ls.textContent.includes('Save to Watch later'))[0]
	menuitemDel.click()
    return 1
}

function doADDPLWL(btnname) {
    let oldurl = window.location.href
	if (!window.location.href.includes("/playlist?list=") && !window.location.href.includes('/playlist?list=WL')) {
		alert("Cant Do That Here")
		return -1
	}
	var final = 0
	const videos = Array.from(window.document.getElementsByTagName('ytd-playlist-video-renderer'))
	var wa = 0
	var zNode = document.getElementById(btnname);
	zNode.disabled = true

	var countd = videos.length
	var count = 0
	var x = setInterval(function () {
		zNode.innerHTML = 'Adding ' + (countd - count) + ' wait ' + ((countd - count) / 2) + ' Seconds';

		// If the count down is finished, write some text
		if (oldurl !== window.location.href || countd === count || (videos[count].getElementsByTagName('ytd-thumbnail-overlay-resume-playback-renderer').length !== 0 && (GM_config.get(btnname+stopWatched) && !window.location.href.includes("/playlist?list=")))) { // check if end of list
			zNode.innerHTML = "Finished Adding " + count;
			setTimeout(() => {
				zNode.disabled = false
				zNode.innerHTML = "Add to Watch Later"
			}, 3000)
			clearInterval(x);
		}
		else {
            final += addPLWL(videos[count],btnname)
        }
		count += 1
	}, 500);//wait .5seconds to do the next interation if you go to quickly you will get timed out
}

function createButton(loc, buttonname, buttonmessage, insertfunc, childnode, buttonfunction) {
	var zNode = document.createElement('button');
	zNode.setAttribute('id', buttonname);
	zNode.setAttribute('class', 'myButtons');
	zNode.innerHTML = buttonmessage
	if (insertfunc === 'before') {
		loc.insertBefore(zNode, childnode)
	} else {
		childnode.after(zNode)
	}

	document.getElementById(buttonname).addEventListener(
		"click", () => { buttonfunction(buttonname) }, false
	);
}

function opGMf(zEvent) { GM_config.open() }

function getParentByTagName(node, tagname) {
	let parent = node
	while (parent.tagName !== tagname.toUpperCase() && parent !== null) {
		parent = parent.parentNode
	}
	return parent
}

function main() {
	//document.addEventListener('yt-page-data-updated', () => { // this event is called when the youtube view is updated to new url*?
	document.addEventListener("yt-navigate-finish", () => { // this event is called when the youtube view is updated to new url*?
        //var selection = parseInt(window.prompt("Please enter a number from 1 to 100", ""), 10);
		var btn = document.getElementById(channelButton);
		var WLbtn = document.getElementById(removeWLButton);
		var stbtn = document.getElementById(settingsButton)
		var sbbtn = document.getElementById(todayButton)
		var sb2btn = document.getElementById(yesterdayButton)
		var plwlbtn = document.getElementById(playlistButton)

		if (window.location.href.match('/(c|user|channel)\/.*\/video') !== null) { // Add to WatchLater Button in users channel videos
			if (btn === null) { // if button doesn't exist
				let lbs = document.getElementsByTagName('ytd-subscribe-button-renderer')[0]
				createButton(lbs, channelButton, 'Add to Watch Later', 'before', lbs.firstChild, doADDWL)
			}
			else {
				btn.style.display = 'block'
			}
		}
		else if (window.location.href.includes("/playlist?list=WL")) { // Remove All Button in Watch Later Playlist
			if (WLbtn === null) { // if button doesn't exist
				let loc = document.getElementsByTagName('ytd-playlist-header-renderer')[0].getElementsByTagName('ytd-menu-renderer')[0]
                if (loc == null){
                    loc = document.getElementsByTagName('ytd-playlist-sidebar-primary-info-renderer')[0].getElementsByTagName('ytd-menu-renderer')[0]
                }
				createButton(loc, removeWLButton, 'Remove All', 'after', loc.lastChild, doRWL)

				if (Array.from(document.getElementsByTagName('ytd-playlist-video-renderer')).length === 0) {
					WLbtn.style.display = 'none'
				}
			}
			else if (Array.from(document.getElementsByTagName('ytd-playlist-video-renderer')).length !== 0) {
				WLbtn.style.display = 'block'
			}


		}
		else if (window.location.href.includes("/playlist?list=")) { // Add to Watch Later button in Playlist View
			if (plwlbtn === null) { // if button doesn't exist
				let loc = document.getElementsByTagName('ytd-playlist-sidebar-primary-info-renderer')[0].getElementsByTagName('ytd-menu-renderer')[0]
				createButton(loc, playlistButton, 'Add to Watch Later', 'after', loc.lastChild, doADDPLWL)

				if (Array.from(document.getElementsByTagName('ytd-playlist-video-renderer')).length === 0) {
					plwlbtn.style.display = 'none'
				}
			}
			else if (Array.from(window.document.getElementsByTagName('ytd-playlist-video-renderer')).length !== 0) {
				plwlbtn.style.display = 'block'
			}


		}
		else if (window.location.href.includes("feed/subscriptions")) { // Add to Watch Later Button in Today/Yesterday Headers of subscriptions page
			if (sbbtn === null) { // if button doesn't exist
				let todv = document.getElementsByTagName('ytd-item-section-renderer')[0]
				let titcont = filtr(Array.from(todv.getElementsByClassName('style-scope')), 'title-container')
				createButton(todv, todayButton, 'Add to Watch Later', 'after', titcont.firstChild, doADDWL)
			}else{sbbtn.style.display = 'block'}

			if (sb2btn === null) { // if button doesn't exist
				let todv2 = document.getElementsByTagName('ytd-item-section-renderer')[1]
				let titcont2 = filtr(Array.from(todv2.getElementsByClassName('style-scope')), 'title-container')
				createButton(todv2, yesterdayButton, 'Add to Watch Later', 'after', titcont2.firstChild, doADDWL)
			}else{sb2btn.style.display = 'block'}

		}
		//else if (window.location.href.includes("/watch?v=") && GM_config.get('pressAgeBTN')) { // Auto clicks I wish to proceed on age restricted videos
		else if (GM_config.get('pressAgeBTN')) { // Auto clicks I wish to proceed on age restricted videos
			//let arv = document.getElementsByTagName("yt-playability-error-supported-renderers")[0]
			//if (arv.getAttribute("hidden") === null) {
                //setTimeout(() => {playARVideo()}, 3000) // this is the only way for this to work both when refreshing page and browsing to the video

                // this bottom part should work if you can guarantee 'yt-page-data-updated' happens before 'yt-player-updated'
				//document.addEventListener('yt-player-updated', playARVideo, { 'once': true })
				document.addEventListener('yt-player-updated', playARVideo)
			//}
		}
		else { // hides some buttons if you are not in the page they are ment to be
			if (btn !== null) {
				btn.style.display = 'none'
			}
			if (WLbtn !== null) {
				WLbtn.style.display = 'none'
			}

		}
        if (stbtn === null) { // settings button next to the youtube logo in the header
            let masth = document.getElementsByTagName('ytd-masthead')[0]
            let masstart = filtr(Array.from(masth.getElementsByClassName('style-scope')), 'start')
            createButton(masstart, settingsButton, 'Settings', 'after', masstart, opGMf)
        }
	});

}

(function (window) {

	"use strict";
	main()
})(window);


//--- Style our newly added elements using CSS.

GM_addStyle(`
		#myRWLButton {
	  background-color: #000000;
	  border: none;
	  color: white;
	  padding: 5px 10px;
	  text-align: center;
	  text-decoration: none;
	  display: inline-block;
	  font-size: var(--ytd-tab-system-font-size);
			cursor:                 pointer;
		}
		#myButton {
	  background-color: #000000;
	  border: none;
	  color: white;
	  padding: 5px 10px;
	  text-align: center;
	  text-decoration: none;
	  display: inline-block;
	  font-size: var(--ytd-tab-system-font-size);
			cursor:                 pointer;
		}
		.myButtons {
	  background-color: #000000;
	  border: none;
	  color: white;
	  padding: 5px 10px;
	  text-align: center;
	  text-decoration: none;
	  display: inline-block;
	  font-size: var(--ytd-tab-system-font-size);
			cursor:                 pointer;
		}
	` );
