/* ServerSide Value */
var formatWFS = new ol.format.WFS();

var xs = new XMLSerializer();

//맵생성 시 추가
var gmlJson = {
  'korea_sido': {}
};
var mapJson = {};
var target_map = 'korea_sido';

/* GML 데이터 */
//맵생성시 추가
gmlJson['korea_sido']['insert'] = new ol.format.GML({
  featureNS: 'seoul',
  featureType: 'korea_sido',
  srsName: 'EPSG:3857'
});

gmlJson['korea_sido']['upddel'] = new ol.format.GML({
  featureNS: 'http://localhost:8088/geoserver/seoul/ows',
  featureType: 'korea_sido',
  srsName: 'EPSG:3857'
});

function transactWFS(mode, f) {
  var node;
  switch (mode) {
    case 'insert':
      node = formatWFS.writeTransaction([f], null, null, gmlJson[target_map]['insert']);
      break;
    case 'update':
      node = formatWFS.writeTransaction(null, [f], null, gmlJson[target_map]['upddel']);
      break;
    case 'delete':
      node = formatWFS.writeTransaction(null, null, [f], gmlJson[target_map]['upddel']);
      break;
  }
  var payload = xs.serializeToString(node);
  switch (mode) {
    case 'update':
      var payload = payload.replace("feature:" + target_map, "seoul:" + target_map);
      break;
  }
  $.ajax('http://localhost:8088/geoserver/seoul/ows', {
    type: 'POST',
    dataType: 'xml',
    processData: false,
    contentType: 'text/xml',
    data: payload
  }).done(function (data1, data2, data3) {
    console.log(data1);
    console.log(data2);
    //mapJson[target_map].clear();
  }).always(function () {
    switch (mode) {
      case 'insert':
        var propNodes = node.getElementsByTagName("Property");
        for (var i = 0; i < propNodes.length; i++) {
          var propNode = propNodes[i];
          var propNameNode = propNode.firstElementChild;
          var propNameNodeValue = propNameNode.firstChild;
          if (propNameNodeValue.nodeValue === "geometry") {
            propNode.parentNode.removeChild(propNode);
            break;
          }
        }
        break;
    }
  });
};

/* 맵데이터 */
temp_tc_spbe17_2015_w = new ol.source.Vector({
  loader: function (extent) {
    $.ajax('http://localhost:8088/geoserver/seoul/ows', {
      type: 'GET',
      data: {
        service: 'WFS',
        version: '1.1.0',
        request: 'GetFeature',
        typename: 'seoul:korea_sido',
        srsname: 'EPSG:3857',
        bbox: extent.join(',') + ',EPSG:3857'
      }
    }).done(function (response) {
      temp_tc_spbe17_2015_w.addFeatures(formatWFS.readFeatures(response));
    });
  },
  strategy: ol.loadingstrategy.bbox,
  projection: 'EPSG:3857'
});

mapJson['korea_sido'] = new ol.layer.Vector({
  source: temp_tc_spbe17_2015_w,
  style: new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 0, 0, 0.2)',
    }),
    stroke: new ol.style.Stroke({
      color: '#ff0000',
      width: 2,
    }),
    image: new ol.style.Circle({
      radius: 7,
      fill: new ol.style.Fill({
        color: '#ff0000',
      }),
    }),
  }),
});

var map = new ol.Map({
  layers: [
    new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: 'http://xdworld.vworld.kr:8080/2d/Base/201802/{z}/{x}/{y}.png'
      })
    }),
    mapJson['korea_sido']
  ],
  target: document.getElementById('map'),
  view: new ol.View({
    center: [14128579.82, 4512570.74],
    maxZoom: 19,
    zoom: 11
  })
});

// var map = new naver.maps.Map(document.getElementById('map'), {
//   zoom: 10,
//   // maxZoom:11,
//   mapTypeId: 'normal',
//   center: new naver.maps.LatLng(36.4203004, 128.317960),
//   mapTypeControl : true
// });

/* Delete */
var ExampleDelete = {
  init: function () {
    this.select = new ol.interaction.Select();
    map.addInteraction(this.select);

    this.setEvents();
    this.setActive(false);

    this.selectItem = null;
  },
  setEvents: function () {
    var selectedFeatures = this.select.getFeatures();
    selectedFeatures.on('add', function (event) {
      this.selectItem = event.element;
    }, this);
    selectedFeatures.on('remove', function (event) {
      this.selectItem = null;
    }, this);
  },
  setActive: function (active) {
    this.select.setActive(active);
  },
};
ExampleDelete.init();

function deleteItem() {
  if (rdo_delete.checked == true) {
    if (ExampleDelete.selectItem != null) {
      if (confirm("정말 삭제하시겠습니까?")) {
        transactWFS('delete', ExampleDelete.selectItem);
        mapJson[target_map].getSource().removeFeature(ExampleDelete.selectItem);
        ExampleDelete.select.getFeatures().clear();
      }
    }
  }
}
/* ModiFy */
var ExampleModify = {
  init: function () {
    this.select = new ol.interaction.Select();
    map.addInteraction(this.select);

    this.modify = new ol.interaction.Modify({
      features: this.select.getFeatures(),
    });
    map.addInteraction(this.modify);

    this.setEvents();
    this.setActive(false);
  },
  setEvents: function () {
    var selectedFeatures = this.select.getFeatures();

    this.select.on('change:active', function () {
      selectedFeatures.forEach(function (each) {
        selectedFeatures.remove(each);
      });
    });

    this.dirty = {};

    this.select.getFeatures().on('add', function (e) {
      e.element.on('change', function (e) {
        ExampleModify.dirty[e.target.getId()] = true;
      });
    });

    this.select.getFeatures().on('remove', function (e) {
      var f = e.element;
      if (ExampleModify.dirty[f.getId()]) {
        delete ExampleModify.dirty[f.getId()];
        var featureProperties = f.getProperties();
        delete featureProperties.boundedBy;
        var clone = new ol.Feature(featureProperties);
        clone.setId(f.getId());
        transactWFS('update', clone);
      }
    });
  },
  setActive: function (active) {
    this.select.setActive(active);
    this.modify.setActive(active);
  },
};
ExampleModify.init();

/* Draw */
var optionsForm = document.getElementById('options-form');
var drawObj = null;
var ExampleDraw = {
  init: function () {
    this.setDrawType();
    map.addInteraction(this.Point);
    map.addInteraction(this.LineString);
    map.addInteraction(this.Polygon);
    map.addInteraction(this.Circle);

    this.Point.on('drawend', function (e) {
      transactWFS('insert', e.feature);
    })
    this.LineString.on('drawend', function (e) {
      transactWFS('insert', e.feature);
    })
    this.Polygon.on('drawend', function (e) {
      var f = e.feature;
      f.set('emd_cd', '11111111');
      f.set('emd_nm', '테스트');
      f.set('emd_eng_nm', 'test');
      f.setGeometryName('geom');
      drawObj = f;
      transactWFS('insert', e.feature);
    })
    this.Circle.on('drawend', function (e) {
      transactWFS('insert', e.feature);
    })

    this.Point.setActive(false);
    this.LineString.setActive(false);
    this.Polygon.setActive(false);
    this.Circle.setActive(false);
    // The snap interaction must be added after the Modify and Draw interactions
    // in order for its map browser event handlers to be fired first. Its handlers
    // are responsible of doing the snapping.
    map.addInteraction(this.snap);
  },
  setDrawType: function () {
    var source = mapJson[target_map].getSource();
    this.Point = new ol.interaction.Draw({
      source: source,
      type: 'Point',
      geometryName: 'geom',
    });
    this.LineString = new ol.interaction.Draw({
      source: source,
      type: 'MultiLineString',
      geometryName: 'geom',
    });
    this.Polygon = new ol.interaction.Draw({
      source: source,
      type: 'MultiPolygon',
      geometryName: 'geom',
    });
    this.Circle = new ol.interaction.Draw({
      source: source,
      type: 'Circle',
      geometryName: 'geom',
    });
    this.snap = new ol.interaction.Snap({
      source: source,
    });
  },
  getActive: function () {
    return this.activeType ? this[this.activeType].getActive() : false;
  },
  setActive: function (active) {
    var type = optionsForm.elements['draw-type'].value;
    if (active) {
      this.activeType && this[this.activeType].setActive(false);
      this[type].setActive(true);
      this.activeType = type;
    } else {
      this.activeType && this[this.activeType].setActive(false);
      this.activeType = null;
    }
  },
  removeInteraction: function () {
    map.removeInteraction(this.Point);
    map.removeInteraction(this.LineString);
    map.removeInteraction(this.Polygon);
    map.removeInteraction(this.Circle);
    map.removeInteraction(this.snap);
  }
};
ExampleDraw.init();

/**
 * Let user change the geometry type.
 * @param {Event} e Change event.
 */

optionsForm.onchange = function (e) {
  var type = e.target.getAttribute('name');
  var value = e.target.value;
  if (type == 'draw-type') {
    ExampleDraw.getActive() && ExampleDraw.setActive(true);
  } else if (type == 'map-type') {
    if (rdo_draw.checked) {
      rdo_draw.checked = false;
    } else if (rdo_modify.checked) {
      ExampleModify.setActive(false);
      ExampleModify.setActive(true);
    } else if (rdo_delete.checked) {
      ExampleDelete.setActive(false);
      ExampleDelete.setActive(true);
    }
    map.removeLayer(mapJson[target_map]);
    map.addLayer(mapJson[value]);
    ExampleDraw.removeInteraction();

    target_map = value;
    ExampleDraw.init();
  } else if (type == 'interaction') {
    if (value == 'modify') {
      ExampleDraw.setActive(false);
      ExampleModify.setActive(true);
      ExampleDelete.setActive(false);
    } else if (value == 'draw') {
      ExampleDraw.setActive(true);
      ExampleModify.setActive(false);
      ExampleDelete.setActive(false);
    } else if (value == 'delete') {
      ExampleDraw.setActive(false);
      ExampleModify.setActive(false);
      ExampleDelete.setActive(true);
    }
  }
};