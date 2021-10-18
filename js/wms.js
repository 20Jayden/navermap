var source = new ol.source.XYZ({ url: 'http://xdworld.vworld.kr:8080/2d/Base/201802/{z}/{x}/{y}.png' });

var viewLayer = new ol.layer.Tile({ source: source });

  var tileImg = new ol.layer.Tile({
      source : new ol.source.TileWMS({
          url: "http://localhost:8088/geoserver/seoul/wms",
          // params:{
          //     "VERSION": "1.1.0",
          //     "request" : "GetMap",
          //     "LAYERS" : "seoul:seoul_lawdcd",
          //     "BBOX" : "935035.1875,1936665.5,972067.625,1966987.125",
          //     "SRS" : "EPSG:5179",
          //     "FORMAT" : "application/openlayers"
          //     // width=768&height=628&srs=EPSG%3A5179&format=application/openlayers
          // },
          params: { 
            'FORMAT': 'image/png', 
            'VERSION': '1.1.0', 
            tiled: true, 
            "STYLES": '', 
            "LAYERS": 'seoul:seoul_lawdcd' // workspace:layer 
          }
      })
  });

  var view = new ol.View({ center: [14128579.82, 4512570.74], zoom: 14, });
  var mapView = new ol.Map({ target: "map", // 지도를 생성할 element 객체의 id 값, 
        layers: [viewLayer, tileImg], //생성한 레이어 추가, 
        view: view //view 설정
    });