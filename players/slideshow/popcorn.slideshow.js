// Popcorn slideshow Player Wrapper
( function( Popcorn, global ) {
   
  // Trackers
  var timeupdateInterval = 33,
      timeCheckInterval = 0.75,
      abs = Math.abs,
      registry = {};
  
  // base object for DOM-related behaviour like events
  var EventManager = function ( owner ) {
    var evts = {};
    
    function makeHandler( evtName ) {
      if ( !evts[evtName] ) {
        evts[evtName] = [];
        
        // Create a wrapper function to all registered listeners
        this["on"+evtName] = function( args ) {
          Popcorn.forEach( evts[evtName], function( fn ) {
            if ( fn ) {
              fn.call( owner, args );
            }
          });
        };
      }
    }
    
    return {
      addEventListener: function( evtName, fn, doFire ) {
        evtName = evtName.toLowerCase();
        
        makeHandler.call( this, evtName );
        evts[evtName].push( fn );
        
        if ( doFire ) {
          dispatchEvent( evtName );
        }
        
        return fn;
      },
      // Add many listeners for a single event
      // Takes an event name and array of functions
      addEventListeners: function( evtName, events ) {
        evtName = evtName.toLowerCase();
        
        makeHandler.call( this, evtName );
        evts[evtName] = evts[evtName].concat( events );
      },
      removeEventListener: function( evtName, fn ) {
        var evtArray = this.getEventListeners( evtName ),
            i,
            l;
        
        // Find and remove from events array
        for ( i = 0, l = evtArray.length; i < l; i++) {
          if ( evtArray[i] === fn ) {
            var removed = evtArray[i];
            evtArray[i] = 0;
            return removed;
          }
        }
      },
      getEventListeners: function( evtName ) {
        if( evtName ) {
          return evts[ evtName.toLowerCase() ] || [];
        } else {
          return evts;
        }
      },
      dispatchEvent: function( evt, args ) {        
        // If event object was passed in, toString will yield event type as string (timeupdate)
        // If a string, toString() will return the string itself (timeupdate)
        evt = "on"+evt.toString().toLowerCase();
        this[evt] && this[evt]( args );
      }
    };
  };
      
  Popcorn.slideshow = function( mediaId, list, options ) {
    return new Popcorn.slideshow.init( mediaId, list, options );
  };
  
  Popcorn.slideshow.onLoad = function( playerId ) {
    var player = registry[ playerId ];
    
    player.swfObj = document.getElementById( playerId );
    
    // For calculating position relative to video (like subtitles)
    player.offsetWidth = player.swfObj.offsetWidth;
    player.offsetHeight = player.swfObj.offsetHeight;
    player.offsetParent = player.swfObj.offsetParent;
    player.offsetLeft = player.swfObj.offsetLeft;
    player.offsetTop = player.swfObj.offsetTop;

    player.dispatchEvent( "load" );
  };
  
  Popcorn.getScript( "http://ajax.googleapis.com/ajax/libs/swfobject/2.2/swfobject.js" );
  
  // A constructor, but we need to wrap it to allow for "static" functions
  Popcorn.slideshow.init = (function() {

 
     var rPlayerUri = /^http:\/\/slideshare\.net\/[\S]+\/[\S]+/i,
     rWebUrl = /slideshare\.net\/[\S]+\/[\S]+/,
 
	        hasAPILoaded = false;
    

    function extractIdFromUri( uri ) {
      if ( !uri ) {
        return;
      }
      //var matches = rPlayerUri;

      var matches = uri.match( rPlayerUri );
	  return matches ? matches[0].substr(25) : "";
	 //return matches;
    }
    

    function extractIdFromUrl( url ) {
      if ( !url ) {
        return;
      }
      //var matches = rWebUrl;
      var matches = url.match( rWebUrl );
      return matches ? matches[0].substr(25) : "";
	  //return matches;
    }
      
    function makeSwf( self, slideId, containerId ) {
     
	  if ( !window.swfobject ) {
        setTimeout( function() {
          makeSwf( self, slideId, containerId );
        }, 1);
        return;
      }
      
      var params,
          flashvars,
          attributes = {};
          
      flashvars = {

	   doc : slideId,
        show_portrait: 1,
        show_byline: 1,
        show_title: 1,
        // required in order to use the Javascript API
        js_api: 1,
        // moogaloop will call this JS function when it's done loading (optional)
        js_onLoad: 'Popcorn.slideshow.onLoad',
        // this will be passed into all event methods so you can keep track of multiple moogaloops (optional)
        js_swf_id: containerId
      };
      params = {
        allowscriptaccess: 'always',
        allowfullscreen: 'true',
        // This is so we can overlay html ontop o fFlash
        wmode: 'transparent'
      };
      

      swfobject.embedSWF( "http://static.slidesharecdn.com/swf/ssplayer2.swf", containerId, self.offsetWidth, self.offsetHeight, "9.0.0", "expressInstall.swf", flashvars, params );
    }
    
    // If container id is not supplied, assumed to be same as player id
    var ctor = function ( containerId, slideUrl, options ) {
      if ( !containerId ) {
        throw "Must supply an id!";
      } else if ( /file/.test( location.protocol ) ) {
        throw "Must run from a web server!";
      }
      
      var slideId,
          that = this,
          tmp;

      this._container = document.createElement( "div" );
      this._container.id = containerId + "object";
      this._target = document.getElementById( containerId );
      this._target.appendChild( this._container );
      
      options = options || {};

      options.css && Popcorn.extend( this._target.style, options.css );
      
      this.addEventFn;
      this.evtHolder;
      this.currentTime = 0;

      this.readyState = 0;
      
      this.previousCurrentTime = this.currentTime;
      this.evtHolder = new EventManager( this );
      
      // For calculating position relative to video (like subtitles)
      this.width = this._target.style.width || "504px";
      this.height = this._target.style.height || "340px";

      if ( !/[\d]%/.test( this.width ) ) {
        this.offsetWidth = parseInt( this.width, 10 );
        this._target.style.width = this.width + "px";
      } else {
        // convert from pct to abs pixels
        tmp = this._target.style.width;
        this._target.style.width = this.width;
        this.offsetWidth = this._target.offsetWidth;
        this._target.style.width = tmp;
      }
      
      if ( !/[\d]%/.test( this.height ) ) {
        this.offsetHeight = parseInt( this.height, 10 );
        this._target.style.height = this.height + "px";
      } else {
        // convert from pct to abs pixels
        tmp = this._target.style.height;
        this._target.style.height = this.height;
        this.offsetHeight = this._target.offsetHeight;
        this._target.style.height = tmp;
      }
      
      this.offsetLeft = 0;
      this.offsetTop = 0;
      
      // Try and get a slide id from a slideshow site url
      // Try either from ctor param or from iframe itself
      slideId = extractIdFromUrl( slideUrl ) || extractIdFromUri( slideUrl );
      
      if ( !slideId ) {
        throw "No video id";
      }
      
      registry[ this._container.id ] = this;
      
      makeSwf( this, slideId, this._container.id );
      
      // Set up listeners to internally track state as needed
      this.addEventListener( "load", function() {
        var hasLoaded = false;
        
        that.duration = that.swfObj.api_getDuration();
        that.evtHolder.dispatchEvent( "durationchange" );
        that.evtHolder.dispatchEvent( "loadedmetadata" );
        
        // Chain events and calls together so that this.currentTime reflects the current time of the video
        // Done by Getting the Current Time while the video plays
        that.addEventListener( "timeupdate", function() {
          that.currentTime = that.swfObj.api_getCurrentTime();
        });
        
        
        // Add progress listener to keep track of ready state
        that.addEventListener( "progress", function( data ) {
          if ( !hasLoaded ) {
            hasLoaded = 1;
            that.readyState = 3;
            that.evtHolder.dispatchEvent( "readystatechange" );
          }
          
          // Check if fully loaded
          if ( data.percent === 100 ) {
            that.readyState = 4;
            that.evtHolder.dispatchEvent( "readystatechange" );
            that.evtHolder.dispatchEvent( "canplaythrough" );
          }
        });
      });
    };
    return ctor;
  })();
  
  Popcorn.slideshow.init.prototype = Popcorn.slideshow.prototype;
  
  // Sequence object prototype
  Popcorn.extend( Popcorn.slideshow.prototype, {

  // jump to slide
  // empty method right now as 
    jumpToSlide: function() {

    

    },

    // Hook an event listener for the player event into internal event system
    // Stick to HTML conventions of add event listener and keep lowercase, without prependinng "on"
    addEventListener: function( evt, fn ) {
      var playerEvt,
          that = this;
      
      // In case event object is passed in
      evt = evt.type || evt.toLowerCase();
      
      // If it's an HTML media event supported by player, map
      if ( evt === "timeupdate" ) {
        playerEvt = "onProgress";
      } else if ( evt === "progress" ) {
        playerEvt = "onLoading";
      } 
      
      // slideshow only stores 1 callback per event
      // Have slideshow call internal collection of callbacks
      this.evtHolder.addEventListener( evt, fn, false );
      
      // Link manual event structure with slideshow's if not already
      if( playerEvt && this.evtHolder.getEventListeners( evt ).length === 1 ) {

          Popcorn.slideshow[playerEvt] = function( arg1 ) {
            var player = registry[arg1];
            player.evtHolder.dispatchEvent( evt );
          };

        
        this.swfObj.api_addEventListener( playerEvt, "Popcorn.slideshow."+playerEvt );
      }
    },
    removeEventListener: function( evtName, fn ) {
      return this.evtHolder.removeEventListener( evtName, fn );
    },
    dispatchEvent: function( evtName ) {
      return this.evtHolder.dispatchEvent( evtName );
    },
    getBoundingClientRect: function() {
      return this._target.getBoundingClientRect();
    },
    startTimeUpdater: function() {
      var self = this,
          seeked = 0;
      
      if ( abs( this.currentTime - this.previousCurrentTime ) > timeCheckInterval ) {
        // Has programatically set the currentTime
        this.setCurrentTime( this.currentTime );
        seeked = 1;
      } else {
        this.previousCurrentTime = this.currentTime;
      }

    }
  });
})( Popcorn, window );
