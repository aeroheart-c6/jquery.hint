/**
 * @author joyu0910
 * @author aeroheart.c6
 * 
 * Classes used by the plugin:
 *    jquery.hint-element
 *    jquery.hint-choice-container
 *    jquery.hint-choice
 *    jquery.hint-choice.selected
 *    
 * choiceData (see ajax success callback starting @ line 63) object structure:
 *  [
 *    {
 *      label: '', //Label to be displayed
 *      image: '', //Image url for the choice. Optional
 *    }
 *  ]
 */
(function($) {
  /**
   * Consider this as the plug-in factory
   */
  var pluginInstances = [];
  
  $.fn.hint = function(configObject) {
    if (typeof configObject != 'object')
      return this;
    
    var elements = this;
    
    var cssConf  = $.extend({}, {
      auto:true,
      file:'css/jquery.hint.css'
    }, configObject.css);
    
    //Import the specified CSS file, if not existing - and allowed
    if (cssConf.auto && $('head').find('link[href="' + cssConf.file + '"]').length == 0)
      $('head')
        .append($('<link>').attr('rel',  'stylesheet')
                           .attr('type', 'text/css')
                           .attr('href', cssConf.file));
    
    /*
     * Retrieve the data for selection from the server. Use the
     * currentConfig.ajaxConfig object for the ajax settings.
     * 
     * Refer to JSDoc on top for expected properties of each choice
     */
    var ajaxConf = $.extend({}, {
      url:     '',
      type:    'get',
      dataType:'text',
      success: function(responseData) {
        return null;
      }
    }, configObject.ajax);

    $.ajax ({
      url:     ajaxConf.url,
      type:    ajaxConf.type,
      dataType:ajaxConf.dataType,
      cache:   false,
      success: function(responseData) {
        var choiceTemp = ajaxConf.success(responseData);
        
        var choiceInfo = [];
        $(choiceTemp).each(function (index, arrayElement) {
          choiceInfo.push(
            $.extend({}, {
              label:'',
              image:''
            }, this)
          );
        });
        
        var optionsConf = $.extend({}, {
          trigger: '@',
          limit  : 5
        }, configObject.options);
        
        $(elements).each(function () {
          pluginInstances.push(new $.hint($, $(this), optionsConf, choiceInfo));
        });
      }
    });
    
    return this;
  };

  
  /**
   * The plug-in itself.
   */
  $.hint = function($, element, optionsConf, choiceData) {
    var performFilter = false;
    
    var choiceContainer = $('<div class="jquery hint-choice-container">');
    var choiceInfo; //Array of POJSO
    
    var latestTagCharIdx;
    var latestKeyCharIdx;
    
    var thisChoiceIdx;
    var prevChoiceIdx;
    
    var triggerChar;
    var choiceLimit;
    
    /*
     * Function that acts as the plugin's constructor
     */
    function initPlugin() {
      choiceInfo = choiceData;
      
      triggerChar = optionsConf.trigger.charCodeAt(0);
      choiceLimit = optionsConf.limit;
      
      element.addClass('jquery hint-element')
             .click   (handleInputClickEvents)
             .keyup   (handleInputKeyUpEvents)
             .keydown (handleInputKeyDownEvents)
             .keypress(handleInputKeyPressEvents)
             .focusout(handleInputFocusOutEvents);
             
      $('body').append(choiceContainer);
      
      thisChoiceIdx = -1;
    }
    
    /*
     * Returns an array of choices to be rendered
     */
    function filterChoices(searchString) {
      var filteredChoices = [];
      
      choiceContainer.children().remove();
      
      $(choiceInfo).each (function(index) {        
        if (this.label.search (new RegExp('^' + searchString, 'gim')) >= 0 && filteredChoices.length < choiceLimit)
          filteredChoices.push(this);
      });
      
      $(filteredChoices).each(function(index) {
        var choiceTag = $('<p class="jquery hint-choice">')
                          .attr ('innerHTML', this.label)
                          .data ('label', this.label)
                          .click(function(event) {
          var proceedingText,
              preceedingText,
              nextCaretIndex;
          
          preceedingText = element.val().substring(0, latestTagCharIdx);
          proceedingText = element.val().substring(latestKeyCharIdx, element.val().length);
          
          nextCaretIndex = latestTagCharIdx + $(this).data('label').length;
          
          element.val (preceedingText +
                       $(this).data('label') +
                       proceedingText);
          
          removeChoiceContainer();
          
          setCaretPosition(nextCaretIndex);
          performFilter = false;
        });
        
        if (this.image.length == 0)
          choiceContainer.append(choiceTag);
        else
          choiceContainer.append(choiceTag.prepend (
              $('<img>').attr('src', this.image)
          ));
      });
    }
    
    /*
     * Removes the container that renderes the choices
     */
    function removeChoiceContainer() {      
      choiceContainer.children().remove('p.jquery.hint-choice');
      choiceContainer.hide();
      
      element.focus();
    }
    
    /*
     * Does the maths for properly rendering the choices
     */
    function renderChoiceContainer() {
      choiceContainer.css({
        'position': 'absolute',
        'top'     : (element.offset().top + element.height() + 5),
        'left'    : (element.offset().left + 1)
      });
      
      choiceContainer.show();
    }
    
    //************************//
    // Event Handlers Section //
    //************************//
    
    function handleInputClickEvents(event) {
      if (getCaretPosition() < latestTagCharIdx || getCaretPosition() > latestKeyCharIdx)
        performFilter = false;
        
      removeChoiceContainer();
    }
    
    function handleInputKeyDownEvents(event) {
      if ((event.which == 13 || event.which == 38 || event.which == 40) && performFilter)
        event.preventDefault();
    }
    
    function handleInputKeyUpEvents(event) {
      var choiceChildren,
          preceedingText,
          proceedingText,
          nextCaretIndex;
      
      // Arrow Keys
      if ((event.which >= 37 && event.which <= 40)
           && performFilter) {
        choiceChildren = choiceContainer.children('p.jquery.hint-choice');
        
        //Up is pressed
        if (event.which == 38) {
          if (thisChoiceIdx < 0) {
            prevChoiceIdx = thisChoiceIdx;
            thisChoiceIdx = choiceChildren.length - 1;
            
            $(choiceChildren.get(thisChoiceIdx)).addClass('selected');
          }
          else if (thisChoiceIdx == 0) {
            prevChoiceIdx = thisChoiceIdx;
            thisChoiceIdx = choiceChildren.length - 1;
            
            $(choiceChildren.get(prevChoiceIdx)).removeClass('selected');
            $(choiceChildren.get(thisChoiceIdx)).addClass   ('selected');
          }
          else {
            prevChoiceIdx = thisChoiceIdx--;
            
            if (prevChoiceIdx >= 0)
              $(choiceChildren.get(prevChoiceIdx)).removeClass('selected');
            
            $(choiceChildren.get(thisChoiceIdx)).addClass('selected');
          }
        }
        //Down is pressed
        else if (event.which == 40)
          if (thisChoiceIdx == choiceChildren.length - 1) {
            prevChoiceIdx = thisChoiceIdx;
            thisChoiceIdx = 0;
            
            $(choiceChildren.get(prevChoiceIdx)).removeClass('selected');
            $(choiceChildren.get(thisChoiceIdx)).addClass   ('selected');
          }
          else {
            prevChoiceIdx = thisChoiceIdx++;
            
            if (prevChoiceIdx >= 0)
              $(choiceChildren.get(prevChoiceIdx)).removeClass('selected');
            
            $(choiceChildren.get(thisChoiceIdx)).addClass('selected');
          }
        else if (getCaretPosition() < latestTagCharIdx + 1|| getCaretPosition() > latestKeyCharIdx)
            performFilter = false;
      }
      // Enter
      else if (event.which == 13 && performFilter) {
        choiceChildren = choiceContainer.children('p.jquery.hint-choice.selected');
        
        if (choiceChildren.length == 0)
          choiceChildren = choiceContainer.children(':first');
        
        if (choiceChildren.length == 0)
          choiceChildren = $('<p class="jquery hint-choice">')
                             .data('label', '');
        
        preceedingText = element.val().substring(0, latestTagCharIdx);
        proceedingText = element.val().substring(latestKeyCharIdx, element.val().length);
        
        element.val(preceedingText +
                    choiceChildren.data('label') +
                    proceedingText);

        nextCaretIndex = latestTagCharIdx + choiceChildren.data('label').length;
        
        removeChoiceContainer();
        setCaretPosition(nextCaretIndex);
        
        thisChoiceIdx = -1;
        prevChoiceIdx = null;
        
        performFilter = false;
      }
      else {
        // Backspace
        if (event.which == 8 && performFilter) {
          if (getCaretPosition() == latestTagCharIdx - 1) {
            removeChoiceContainer();

            performFilter = false;
          }
          else
            filterChoices (element.val().substring(latestTagCharIdx, latestKeyCharIdx + 1).trim());

          latestKeyCharIdx = getCaretPosition();
        }
        // all the other keys
        else if (performFilter) {
          filterChoices(element.val().substring(latestTagCharIdx, latestKeyCharIdx + 1).trim());

          latestKeyCharIdx = getCaretPosition() + 1;
        }
      }
    }
    
    function handleInputKeyPressEvents(event) {
      // Trigger character (default: '@')
      if (event.which == triggerChar && !performFilter) {
        latestTagCharIdx = getCaretPosition() + 1;
        latestKeyCharIdx = getCaretPosition() + 1;
        
        renderChoiceContainer();
        element.focus();
        
        filterChoices(element.val().substring(latestTagCharIdx, latestKeyCharIdx + 1).trim());
        
        performFilter = true;
      }
      // Space
      else if (event.which == 32 && performFilter) {
        removeChoiceContainer();
        
        performFilter = false;
      }
    }
    
    function handleInputFocusOutEvents() {
      performFilter = false;
    }
    
    //***************//
    // Miscellaneous //
    //***************//
    /*
     * Caret position stuff taken at:
     * http://snipplr.com/view/5144/getset-cursor-in-html-textarea/
     */
    function getCaretPosition() {
      var caretPos = 0;
      
      if (document.selection) {
        //Internet Explorer
        var selectionRange;

        element.focus();
        
        selectionRange = document.selection.createRange();
        selectionRange.moveStart ('character', -element.val().length);
        
        caretPos = selectionRange.text.length;
      }
      else if (element[0].selectionStart || element[0].selectionStart == '0')
        //Mozilla-based Browser
        caretPos = element[0].selectionStart;
      
      return caretPos;
    }
    
    function setCaretPosition(caretPosition) {
      var range;
      
      if (element[0].setSelectionRange) {
        element.focus();
        element[0].setSelectionRange (caretPosition, caretPosition);
      }
      else if (element[0].createTextRange) {
        range = element[0].createTextRange();
        range.collapse (true);
        range.moveEnd  ('character', caretPosition);
        range.moveStart('character', caretPosition);
        range.select   ();
      }
    }
    
    //Call the constructor proxy!!
    initPlugin();
  };
})(jQuery);
