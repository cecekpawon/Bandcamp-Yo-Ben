(function () {
// ==UserScript==
// @name           Bandcamp Yo Ben
// @namespace      http://blog.thrsh.net
// @author         cecekpawon (THRSH)
// @description    Bandcamp.com helper
// @version        2.7
// @updateURL      https://github.com/cecekpawon/Bandcamp-Yo-Ben/raw/master/releases/Bandcamp-Yo-Ben.meta.js
// @downloadURL    https://github.com/cecekpawon/Bandcamp-Yo-Ben/raw/master/releases/Bandcamp-Yo-Ben.user.js
// @require        http://code.jquery.com/jquery-latest.js
// @grant          none
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

var _this, YODBNDCMP = function(){};

_this = YODBNDCMP.prototype = {
  $: {},
  $W: window,
  $css: "\
    .yoddownAlbum .yoddown {margin-right:5px;}\
    .yoddownTrack {margin: 10px 0;}\
    .yoddownExt {margin: 20px 10px 0 0;display: inline-block;}\
    .TASwap {display: none; min-width: 100%;margin: 20px 0px;min-height: 200px;background: transparent;color: inherit;}\
    #yod_sel_ext_label {display: block; margin-top: 15px;}\
    .yod_label {clear: both; display: block; margin: 5px 0; cursor: pointer;}\
    .yod_label > * {margin-left: 10px!important;}\
    ",
  $dt: "#",
  $WGet: "",
  $WGetCover: "",
  $WGetDateTpl: "{{DATE}}",
  $WGetCoverTpl: "\n\n{{ARTWORK}}\n\n",
  $WGetBashTpl: "{{BANG}}\n\n",
  $WGetBash: "#!/bin/bash\n\ncd \"`dirname \"$0\"`\"",
  $TralbumData: "",
  $EmbedData: "",
  $Protocol: location.protocol,
  $v_yod_bash: "",
  $v_yod_artwork: "",
  $v_yod_date: "",

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

  fixURL: function(s) {
    return _this.$Protocol + s.replace(/^https?\:?/i, "");
  },

  //## PROG

  init: function(JQ) {
    _this.$ = JQ;
    _this.$(document).ready(function() {
      _this.$TralbumData = _this.$W.TralbumData;
      _this.$EmbedData = _this.$W.EmbedData;
      _this.$v_yod_bash = _this.getValue("yod_bash") !== "sh" ? "bat" : "sh";

      _this.$("<style/>", {text: _this.$css}).appendTo("head");

      if (!_this.$EmbedData) return;
      if (!(_this.$TralbumData || _this.$TralbumData.trackinfo.length)) return;

      _this.getDate();

      _this.$is_album = _this.$TralbumData.item_type.match(/album/i) ? true : false;
      _this.$fn = _this.$EmbedData.artist.trim() + " - ";
      _this.$fn += _this.$EmbedData.hasOwnProperty("album_title") ? _this.$EmbedData.album_title.trim() + _this.$WGetDateTpl + " - " : "";

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
    });
  },

  getDate: function() {
    _this.$date = "";

    _this.$v_yod_date = _this.getValue("yod_date") !== "yes" ? "no" : "yes";

    if (d = _this.$TralbumData.album_release_date) {
      d = new Date(d);
      _this.$date = " (" + ((d.getMonth() + 1) + "-" + d.getDate() + "-" +  d.getFullYear()) + ")";
    }
  },

  toDate: function(d) {
    var date_patt = new RegExp(_this.$WGetDateTpl, "igm");

    return d.replace(date_patt, (_this.$v_yod_date === "yes") ? _this.$date : "");
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
      var bash_patt = new RegExp(_this.$WGetBashTpl, "igm"),
        cover_patt = new RegExp(_this.$WGetCoverTpl, "igm");

      ta_val = _this.$WGet
        .replace(bash_patt, (_this.$v_yod_bash === "sh") ? _this.$WGetBash : "\n\n")
        .replace(cover_patt, (_this.$v_yod_artwork === "yes") ? _this.$WGetCover : "\n\n")
        .replace(/(\\n{3,})/igm, "\n\n")
        .trim();

      ta.val(_this.toDate(ta_val).trim());
    }
  },

  toWGET: function(fn, url, ret) {
    var str = "wget -c -O \"" + fn + "\" \"" + url + "\" --no-check-certificate\n\n";
    if (!ret) _this.$WGet += str;
    return str;
  },

  downloadBlob: function(id) {
    var ta,
      mime = ext = fn = "",
      is_bat = _this.$v_yod_bash === "bat";

    if (!(ta = _this.elExists("#" + id + "_TA"))) return;

    switch (id) {
      case "M3U":
        mime = "application/x-mpegurl";
        ext = ".m3u";
        break;
      case "WGET":
        mime = is_bat ? "application/x-msdos-program" : "application/x-sh";
        ext = "." + _this.$v_yod_bash;
        break;
    }

    fn =  _this.$("#name-section .trackTitle").text().trim() + _this.$date + ext;

    _this.$("#yod_dl_" + id).remove();

    _this.$("<a/>", {
      id: "yod_dl_" + id,
      href: "#",
      html: "#Download " + id,
      "class": "yoddown yoddownExt pseudoLink",
      "download": fn
    })
      .click(function(){
        _this.$W.URL = _this.$W.webkitURL || _this.$W.URL;

        var val = is_bat ? ta.val().replace(/\n/igm, "\r\n") : ta.val(),
          bb = new Blob([val], {type: mime}),
          href = _this.$W.URL.createObjectURL(bb);

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

      f = _this.fixURL(trax.file[f].trim());
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

          sel_ext.find("option[value='"+ _this.$v_yod_bash +"']").prop("selected", true);

          _this.$("<label/>", {id: "yod_sel_ext_label", class: "yod_label", "for": "yod_sel_ext", html: "#Download bash ext"})
            .insertAfter(target)
            .append(sel_ext);

          _this.$("<label/>", {id: "yod_date_label", class: "yod_label", "for": "yod_cb_date", html: "#Include date"})
            .append(
              _this.$("<input/>", {id: "yod_cb_date", type: "checkbox"})
                .prop("checked", _this.$v_yod_date === "yes")
                .change(function(){
                  _this.$v_yod_date = _this.$(this).prop("checked") ? "yes" : "no";
                  _this.setValue("yod_date", _this.$v_yod_date);
                  _this.updateTA();
                })
            )
            .insertAfter(sel_ext.parent());

          if (artwork = _this.elExists("#tralbumArt a img")) {
            _this.$v_yod_artwork = _this.getValue("yod_artwork") !== "yes" ? "no" : "yes";
            _this.setValue("yod_artwork", _this.$v_yod_artwork);
          }

          _this.$("<label/>", {id: "yod_artwork_label", class: "yod_label", "for": "yod_cb_artwork", html: "#Download artwork"})
            .append(
              _this.$("<input/>", {id: "yod_cb_artwork", type: "checkbox"})
                .prop("checked", _this.$v_yod_artwork === "yes")
                .change(function(){
                  _this.$v_yod_artwork = _this.$(this).prop("checked") ? "yes" : "no";
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
          _this.$WGet += _this.$WGetBashTpl;
          _this.$WGet += _this.$WGetCoverTpl;
          _this.$WGetCover = "\n\n" + _this.toWGET(_this.fixfn(_this.$fn) + " artwork.jpg", artwork.parent().attr("href"), true);
        }

        _this.toWGET(tFix, f.replace(/%/gi, "%%"));
        _this.toTA(target, "WGET", _this.$WGet);
      }
    }
  }
};

function doExec() {
  try {
    if (jQuery) {
      var yodBandcamp = new YODBNDCMP();
      yodBandcamp.init(jQuery);
    } else {
      //
    }
  } catch (e) {}
}

document.addEventListener("DOMContentLoaded", doExec, true);
})();
