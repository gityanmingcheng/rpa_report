export const areaData = {
  "河北省": {
    name: "河北省",
    cities: {
      "石家庄市": {
        name: "石家庄市",
        districts: [
          "长安区", "桥西区", "新华区", "井陉矿区", "裕华区", 
          "藁城区", "鹿泉区", "栾城区", "井陉县", "正定县", 
          "行唐县", "灵寿县", "高邑县", "深泽县", "赞皇县", 
          "无极县", "平山县", "元氏县", "赵县", 
          "石家庄高新技术产业开发区", "石家庄循环化工园区", 
          "辛集市", "晋州市", "新乐市"
        ]
      },
      "唐山市": {
        name: "唐山市",
        districts: [
          "路南区", "路北区", "古冶区", "开平区", "丰南区", 
          "丰润区", "曹妃甸区", "滦南县", "乐亭县", "迁西县", 
          "玉田县", "河北唐山芦台经济开发区", "唐山市汉沽管理区", 
          "唐山高新技术产业开发区", "河北唐山海港经济开发区", 
          "遵化市", "迁安市", "滦州市"
        ]
      },
      "秦皇岛市": {
        name: "秦皇岛市",
        districts: [
          "海港区", "山海关区", "北戴河区", "抚宁区", 
          "青龙满族自治县", "昌黎县", "卢龙县", 
          "秦皇岛市经济技术开发区", "北戴河新区"
        ]
      },
      "邯郸市": {
        name: "邯郸市",
        districts: [
          "邯山区", "丛台区", "复兴区", "峰峰矿区", "肥乡区", 
          "永年区", "临漳县", "成安县", "大名县", "涉县", 
          "磁县", "邱县", "鸡泽县", "广平县", "馆陶县", 
          "魏县", "曲周县", "邯郸经济技术开发区", 
          "邯郸冀南新区", "武安市"
        ]
      },
      "邢台市": {
        name: "邢台市",
        districts: [
          "襄都区", "信都区", "任泽区", "南和区", "临城县", 
          "内丘县", "柏乡县", "隆尧县", "宁晋县", "巨鹿县", 
          "新河县", "广宗县", "平乡县", "威县", "清河县", 
          "临西县", "河北邢台经济开发区", "南宫市", "沙河市"
        ]
      },
      "保定市": {
        name: "保定市",
        districts: [
          "竞秀区", "莲池区", "满城区", "清苑区", "徐水区", 
          "涞水县", "阜平县", "定兴县", "唐县", "高阳县", 
          "容城县", "涞源县", "望都县", "安新县", "易县", 
          "曲阳县", "蠡县", "顺平县", "博野县", "雄县", 
          "保定高新技术产业开发区", "保定白沟新城", 
          "涿州市", "定州市", "安国市", "高碑店市"
        ]
      },
      "张家口市": {
        name: "张家口市",
        districts: [
          "桥东区", "桥西区", "宣化区", "下花园区", "万全区", 
          "崇礼区", "张北县", "康保县", "沽源县", "尚义县", 
          "蔚县", "阳原县", "怀安县", "怀来县", "涿鹿县", 
          "赤城县", "张家口经济开发区", "张家口市察北管理区", 
          "张家口市塞北管理区"
        ]
      },
      "承德市": {
        name: "承德市",
        districts: [
          "双桥区", "双滦区", "鹰手营子矿区", "承德县", 
          "兴隆县", "滦平县", "隆化县", "丰宁满族自治县", 
          "宽城满族自治县", "围场满族蒙古族自治县", 
          "承德高新技术产业开发区", "平泉市"
        ]
      },
      "沧州市": {
        name: "沧州市",
        districts: [
          "新华区", "运河区", "沧县", "青县", "东光县", 
          "海兴县", "盐山县", "肃宁县", "南皮县", "吴桥县", 
          "献县", "孟村回族自治县", "河北沧州经济开发区", 
          "沧州高新技术产业开发区", "沧州渤海新区", 
          "泊头市", "任丘市", "黄骅市", "河间市"
        ]
      },
      "廊坊市": {
        name: "廊坊市",
        districts: [
          "安次区", "广阳区", "固安县", "永清县", "香河县", 
          "大城县", "文安县", "大厂回族自治县", 
          "廊坊经济技术开发区", "霸州市", "三河市"
        ]
      },
      "衡水市": {
        name: "衡水市",
        districts: [
          "桃城区", "冀州区", "枣强县", "武邑县", "武强县", 
          "饶阳县", "安平县", "故城县", "景县", "阜城县", 
          "河北衡水高新技术产业开发区", "衡水滨湖新区", 
          "深州市"
        ]
      }
    }
  }
};

// 工具函数
export function findLocationByDistrict(district) {
  const province = areaData["河北省"];
  for (const city of Object.values(province.cities)) {
    if (city.districts.includes(district)) {
      return {
        province: province.name,
        city: city.name,
        district
      };
    }
  }
  return null;
}

export function getCities() {
  return Object.values(areaData["河北省"].cities).map(city => city.name);
}

export function getDistricts(city) {
  return areaData["河北省"].cities[city]?.districts || [];
}

// 使用示例：
/*
// 查找区县所属位置
const location = findLocationByDistrict("长安区");
console.log(location); 
// { province: "河北省", city: "石家庄市", district: "长安区" }

// 获取河北省所有城市
const cities = getCities();
console.log(cities);

// 获取石家庄市所有区县
const districts = getDistricts("石家庄市");
console.log(districts);
*/ 