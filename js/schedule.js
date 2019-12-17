const COLOR = ['#F006', '#FF06', '#0F06', '#0FF6', '#00F6', '#F0F6', '#0006'];
const DAY = 86400000;

function getRangeYears(startDate, length) {
  var year = startDate.getFullYear();
  var data = [];
  for (var i = 0; i < length; ++i, ++year) {
    data.push({ text: year, days: (!(year % 400) || (year % 100 && !(year % 4))) ? 366 : 365 });
  }
  return data;
}

function getRangeMonths(startDate, length) {
  var formatter = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long' });
  var year = startDate.getFullYear();
  var month = startDate.getMonth() + 1;
  var data = [];
  for (var i = 0; i < length; ++i, ++month) {
    var date = new Date(year, month, 0);
    data.push({ text: formatter.format(date), days: date.getDate() });
  }
  return data;
}

function getRangeDays(startDate, length) {
  var formatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', weekday: 'narrow' });
  var year = startDate.getFullYear();
  var month = startDate.getMonth() + 1;
  var day = startDate.getDate();
  var data = [];
  for (var i = 0; i < length; ++i, ++day) {
    date = new Date(year, month, day);
    data.push({ text: formatter.format(date), days: 1 });
  }
  return data;
}

function setBarAttributes(bar, start, end) {
  bar
    .attr('start', start.toLocaleDateString())
    .attr('end', end.toLocaleDateString());
}

(function ($) {
  $.fn.timeSchedule = function (options) {
    var defaults = {
      startDate: new Date(),
      widthTimeX: 1,
      timeScale: DAY,
      scale: 'month',
      change: null,
      click: null,
    };

    var setting = $.extend(defaults, options);
    var rows = new Array();
    var element = $(this);
    var tableStartTime;
    var initialStartDate = setting.startDate;
    var today = new Date();

    function renderRow(row) {
      element.find('.sc_data').append($(`<div class="sc_title"><span class="title">${row.title}</span><span class="sc_title_extra">${row.html || ''}</span></div>`));
      var timeline = $('<div class="timeline"></div>');
      element.find('.sc_main').append(timeline);
      timeline.droppable({ accept: ".sc_Bar" });

      var startTime = Math.ceil((row.start - tableStartTime) / setting.timeScale);
      var endTime = Math.floor((row.end - tableStartTime) / setting.timeScale);
      var bar = $('<div class="sc_Bar"></div>');
      bar.css({
        left: (startTime * setting.widthTimeX),
        width: ((endTime - startTime) * setting.widthTimeX),
      });

      var barCount = element.find(".sc_Bar").length;
      bar.css('background', COLOR[barCount % COLOR.length]);
      timeline.append(bar);
      setBarAttributes(bar, row.start, row.end);

      bar.bind("dblclick", function () {
        if (setting.click) {
          setting.click(row);
        }
      });

      if (!row.locked) {
        function applyDrag(event, ui) {
          var start = tableStartTime + (Math.floor(ui.position.left / setting.widthTimeX) * setting.timeScale);
          var end = start + (row.end - row.start);

          row.start = new Date(start);
          row.end = new Date(end);
          setBarAttributes(bar, row.start, row.end);
        }

        bar.draggable({
          axis: 'x',
          grid: [setting.widthTimeX],
          containment: "parent",
          scroll: false,
          helper: 'original',
          drag: applyDrag,
          stop: function (event, ui) {
            applyDrag(event, ui);
            if (setting.change) {
              setting.change(row);
            }
          }
        });
      }

      function applyResize(event, ui) {
        row.start = new Date(tableStartTime + (Math.floor(ui.position.left / setting.widthTimeX) * setting.timeScale));
        row.end = new Date(tableStartTime + (Math.floor((ui.position.left + ui.size.width) / setting.widthTimeX) * setting.timeScale));
        setBarAttributes(bar, row.start, row.end);
      }

      bar.resizable({
        handles: row.locked ? 'e' : 'e,w',
        containment: 'parent',
        scroll: false,
        grid: [setting.widthTimeX],
        minWidth: setting.widthTimeX,
        resize: applyResize,
        stop: function (event, ui) {
          applyResize(event, ui);
          if (setting.change) {
            setting.change(row);
          }
        }
      });
    }

    function applyScale() {
      setting.startDate = initialStartDate;

      var data;
      var totalDays = 0;
      var header = element.find('.sc_header_scroll');
      switch (setting.scale) {
        case "day":
          setting.widthTimeX = 50;
          setting.startDate = new Date(setting.startDate.getFullYear(), setting.startDate.getMonth(), setting.startDate.getDate());
          data = getRangeDays(setting.startDate, 500);
          break;
        case "month":
          setting.widthTimeX = 10;
          setting.startDate = new Date(setting.startDate.getFullYear(), setting.startDate.getMonth(), 1);
          data = getRangeMonths(setting.startDate, 60);
          break;
        case "year":
          setting.widthTimeX = 1;
          setting.startDate = new Date(setting.startDate.getFullYear(), 0, 1);
          data = getRangeYears(setting.startDate, 5);
          break;
        default:
          throw new Error("Unrecognized scale value: " + scale);
      }

      for (var i = 0; i < data.length; ++i) {
        header.append($(`<span class="sc_time" style="width:${setting.widthTimeX * data[i].days}px;">${data[i].text}</span>`));
        totalDays += data[i].days;
      }

      var todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      element.find('.disabled-section').width(Math.ceil((todayStart - setting.startDate) / DAY * setting.widthTimeX));
      element.find(".sc_main").width(totalDays * setting.widthTimeX);
      element.find('.sc_main').css('background-size', `${setting.widthTimeX * 2}px auto`);

      tableStartTime = setting.startDate.getTime();
    }

    this.getRows = function () {
      return rows;
    }

    this.addRow = function (row) {
      row.locked = row.start < today;
      if (row.start < initialStartDate) {
        initialStartDate = row.start;
      }

      rows.push(row);
    };

    this.setScale = function (scale) {
      setting.scale = scale;
    }

    this.render = function () {
      element.html(`
<div class="sc_wrapper">
  <div class="sc_header">
    <div class="sc_header_cell"><span>&nbsp;</span></div>
    <div class="sc_header_scroll"></div>
  </div>
  <div style="margin-top:26px;">
    <div class="sc_data"></div>
    <div class="sc_main_box">
      <div class="disabled-section"></div>
      <div class="sc_main_scroll">
        <div class="sc_main"></div>
      </div>
    </div>
  </div>
</div>`);

      element.find(".sc_wrapper").on('scroll', function (ev) {
        element.find(".sc_data").css('left', `${ev.target.scrollLeft}px`);
        element.find(".sc_header").css('top', `${ev.target.scrollTop}px`);
      });

      applyScale();

      // Render all rows in alphabetical order:
      for (var row of rows.sort((a, b) => a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1)) {
        renderRow(row);
      }
    };

    this.render();

    return this;
  };
})($);
