(function () {
// ==UserScript==
// @name           Bandcamp Yo Ben
// @namespace      http://blog.thrsh.net
// @author         daYOda (THRSH)
// @description    Bandcamp.com helper
// @version        2.1
// @updateURL      https://userscripts.org/scripts/source/113906.meta.js
// @match          http://*.bandcamp.com/
// @match          http://*.bandcamp.com/album/*
// @match          http://*.bandcamp.com/track/*
// @match          http://*.bandcamp.com/releases*
// @match          https://*.bandcamp.com/
// @match          https://*.bandcamp.com/album/*
// @match          https://*.bandcamp.com/track/*
// @match          https://*.bandcamp.com/releases*
// @run-at         document-start
// ==/UserScript==

const yodUpdate = {
  script_id : 113906,
  script_version : "2.1",
  script_pipeId : "7015d15962d94b26823e801048aae95d",
}

function usoUpdate(el) {
  const s_CheckUpdate = "YodCheckUpdate" + yodUpdate.script_id;
  const s_Redir = false;
  el = el ? el : document.body;
  if (el) {
    if (!document.getElementById(s_CheckUpdate)) {
      var s_gm = document.createElement("script"); s_gm.id = s_CheckUpdate; s_gm.type = "text/javascript";
      s_gm.src = "//usoupdater.herokuapp.com/?id=" + yodUpdate.script_id + "&ver=" + yodUpdate.script_version;
      if (s_Redir) s_gm.src += "&redir=yes";
      el.appendChild(s_gm);
    }
  }
}

var _this, YODBNDCMP = function(){};

_this = YODBNDCMP.prototype = {
  $: {},
  $css: "\
    .yoddownAlbum .yoddown {margin-right:5px;}\
    .yoddownTrack {margin: 10px 0;}\
    .yoddownExt {margin: 20px 10px 0 0;display: inline-block;}\
    .TASwap {display: none; min-width: 100%;margin: 20px 0px;min-height: 200px;background: transparent;color: inherit;}\
    #yod_sel_ext_label {display: block; margin-top: 15px;}\
    #yod_sel_ext, #yod_cb_artwork {margin-left: 10px;}\
    ",
  $dt: "#",
  $WGet: "",
  $WGetCover: "",
  $WGetBash: "#!/bin/bash\n\n",
  $TralbumData: "",
  $EmbedData: "",
  $v_yod_bash: "",
  $v_yod_artwork: "",

  //## UTIL

  setValue: function(key, value) {
    localStorage.setItem(key, value);
    return false;
  },

  getValue: function(key) {
    return localStorage.getItem(key);
  },

  fixfn: function(str, no) {
    if (!str) return "";
    if (no = parseInt(no)) str = (no < 10 ? "0" + no : no) + ". " + str;
    return str.replace(/[\/\\\:\*\?"<>\|]+/g, "-").trim();
  },

  elExists: function(s, el) {
    var e = el ? el.find(s) : _this.$(s);
    return e.length ? e : false;
  },

  //## PROG

  init: function($W) {
    _this.$ = $W.jQuery;
    _this.$TralbumData = $W.TralbumData;
    _this.$EmbedData = $W.EmbedData;
    _this.$v_yod_bash = _this.getValue("yod_bash") !== "sh" ? "bat" : "sh";

    _this.$("<style/>", {text: _this.$css}).appendTo("head");

    if (!_this.$EmbedData) return;
    if (!(_this.$TralbumData || _this.$TralbumData.trackinfo.length)) return;

    _this.$is_album = _this.$TralbumData.item_type.match(/album/i) ? true : false;
    _this.$fn = _this.$EmbedData.artist.trim() + " - ";
    _this.$fn += _this.$EmbedData.hasOwnProperty("album_title") ? _this.$EmbedData.album_title.trim() + " - " : "";

    if (_this.$is_album) {
      _this.$("tr[class*=track_row_view][rel*=tracknum]").not(".yodparsed").each(function() {
        if (i = parseInt(_this.$(this).attr("rel").replace(/[^0-9]/ig, ""))) {
          _this.yodDownload(this, --i);
        }
      });

      _this.updateTA();
    } else {
      if (!(el = _this.elExists("ul[class*=tralbumCommands]"))) return;
      _this.$dt += " Download this Track!";
      _this.yodDownload(el);
    }
  },

  toTA: function(target, id, val) {
    var ta,
      ta_id = id + "_TA",
      a_id = id + "_A";

    if (!(ta = _this.elExists("#" + ta_id))) {
      _this.$("<a/>", {id: a_id, "class": "TAToggle yoddownExt pseudoLink", html: "#" + id, title: "Toggle " + id})
        .insertBefore(target.next())
        .click(function(){
          _this.$(this).next(".TASwap").toggle();
        });

      _this.$("<textarea/>", {id: ta_id, "class": "TASwap hide", "readonly": "readonly"})
        .after('<br/>')
        .insertAfter("#" + a_id)
        .val(val);

      _this.downloadBlob(id);
    }

    _this.$("#" + ta_id).val(val.trim());
  },

  updateTA: function() {
    var ta_val, ta = _this.$("#WGET_TA");

    if (ta_val = ta.val()) {
      var bash_patt = new RegExp(_this.$WGetBash, "igm");
        cover_patt = new RegExp(_this.$WGetCover, "igm");

      ta_val = ta_val.replace(bash_patt, "").replace(cover_patt, "").trim();

      if (_this.$v_yod_bash === "sh") {
        ta_val = _this.$WGetBash + ta_val;
      }

      if (_this.$v_yod_artwork === "yes") {
        ta_val = ta_val.trim() + "\n\n" + _this.$WGetCover;
      }

      ta.val(ta_val.trim());
    }
  },

  toWGET: function(fn, url) {
    var str = "wget -c -O \"" + fn + "\" \"" + url + "\" --no-check-certificate\n\n";
    _this.$WGet += str;
    return str;
  },

  downloadBlob: function(id) {
    var ta = _this.$("#" + id + "_TA"), mime = ext = "";

    if (!ta.length) return;

    switch (id) {
      case "M3U":
        mime = "application/x-mpegurl";
        ext = ".m3u";
        break;
      case "WGET":
        mime = _this.$v_yod_bash === "bat" ? "application/x-msdos-program" : "application/x-sh";
        ext = "." + _this.$v_yod_bash;
        break;
    }

    var fn =  _this.$("#name-section .trackTitle").text().trim() + ext;

    _this.$("#yod_dl_" + id).remove();

    _this.$("<a/>", {
      id: "yod_dl_" + id,
      href: "#",
      html: "#Download " + id,
      "class": "yoddown yoddownExt pseudoLink",
      "download": fn
    })
      .click(function(){
        window.URL = window.webkitURL || window.URL;

        var val = ta.val().replace(/\n/igm, "\r\n");
          bb = new Blob([val], {type: mime}),
          href = window.URL.createObjectURL(bb);

        _this.$(this).attr({href: href, "data-downloadurl": [mime, fn, href].join(":")});
      })
      .insertBefore(_this.$("#" + id + "_A"));
  },

  yodDownload: function(el, i) {
    el = _this.$(el);

    var target = el;

    if (_this.$is_album) {
      if (!(target = _this.elExists("[class*=play-col]", el))) return;
      if (_this.elExists("*[class*=disabled]", target)) {
        target.attr("colspan", 2);
        return;
      }
    }

    el.addClass("yodparsed");

    var index = i || 0,
      trax = _this.$TralbumData.trackinfo[index],
      streamable = parseInt(trax.streaming) || 0;

    if (streamable) {
      var f = Object.keys(trax.file)[0].trim(),
        e = f.match(/^(\w+)\-/i) || "mp3",
        t = trax.title.trim(),
        trx = trax.track_num;

      f = trax.file[f].trim();
      tFix = _this.fixfn(_this.$fn + t + "." + e[1], trx);

      var a = _this.$("<a/>", {
          href: f + "&yod_fn=" + tFix,
          text: _this.$dt,
          "class": "yoddown pseudoLink",
          title: "Download " + t
        });

      if (_this.$is_album) {
        target.removeAttr("colspan");
        _this.$("<td/>", {class: "yoddownAlbum"}).append(a).insertBefore(target);
      } else {
        _this.$("<div/>", {class: "yoddownTrack"}).append(a).insertBefore(target);
      }

      if (target = _this.elExists("#track_table")) {
        if (!_this.elExists("#yod_sel_ext")) {
          var artwork = false,
            sel_ext = _this.$("<select/>", {id: "yod_sel_ext"})
              .append(_this.$("<option/>", {value: "bat", html: ".bat"}))
              .append(_this.$("<option/>", {value: "sh", html: ".sh"}))
              .change(function(){
                _this.$v_yod_bash = _this.$(this).val();
                _this.setValue("yod_bash", _this.$v_yod_bash);
                _this.updateTA();
                _this.downloadBlob("WGET");
              });

          sel_ext.find("option[value=\""+ _this.$v_yod_bash +"\"]").attr("selected", "selected");

          _this.$("<label/>", {id: "yod_sel_ext_label", "for": "yod_sel_ext", html: "#Download bash ext"})
            .insertAfter(target)
            .append(sel_ext);

          if (artwork = _this.elExists("#tralbumArt a img")) {
            _this.$v_yod_artwork = _this.getValue("yod_artwork") !== "no" ? "yes" : "no";
            _this.setValue("yod_artwork", _this.$v_yod_artwork);
          }

          _this.$("<label/>", {id: "yod_artwork_label", "for": "yod_cb_artwork", html: "#Download artwork"})
            .append(
              _this.$("<input/>", {id: "yod_cb_artwork", type: "checkbox", checked: _this.$v_yod_artwork === "yes" ? "checked" : false})
                .change(function(){
                  _this.$v_yod_artwork = _this.$(this).attr("checked") === "checked" ? "yes" : "no";
                  _this.setValue("yod_artwork", _this.$v_yod_artwork);
                  _this.updateTA();
                })
            )
            .insertAfter(sel_ext.parent());
        }

        if (!_this.$Traklists) _this.$Traklists = "#EXTM3U\n\n";
        _this.$Traklists += "#EXTINF:" + Math.round(trax.duration) + "," + t + "\n" + f + "\n\n";
        _this.toTA(target, "M3U", _this.$Traklists);

        // WGET //
        if (!_this.$WGet) {
          if (_this.v_yod_bash === "sh") _this.$WGet += _this.$WGetBash;
          if (artwork) {
            _this.$WGetCover = _this.toWGET(_this.fixfn(_this.$fn) + " artwork.jpg", artwork.parent().attr("href")).trim();
          }
        }

        _this.toWGET(tFix, f.replace(/%/gi, "%%"));
        _this.toTA(target, "WGET", _this.$WGet);
      }
    }
  }
};

function doExec() {
  usoUpdate();

  var $W;

  try {
    if (window.chrome && (unsafeWindow == window)) {
      $W = (function() {
        var el = document.createElement("p");
        el.setAttribute("onclick", "return window;");
        return el.onclick();
      }());
    } else if (typeof unsafeWindow !== "undefined") {
      $W = unsafeWindow;
    }

    if (typeof $W.jQuery === "undefined") {
      window.setTimeout(doExec, 1000);
    } else {
      var JQ = $W.jQuery, yodBandcamp = new YODBNDCMP(JQ);
      JQ(document).ready(function() {
        yodBandcamp.init($W);
      });
    }
  } catch (e) {}
}

document.addEventListener("DOMContentLoaded", doExec, true);
})();