import Toast from '@vant/weapp/toast/toast';

Page({
  data: {
    dailyPlans: [],
    startDate: '',
    endDate: '',
    showMap: true,
    center: {
      latitude: 39.908823,
      longitude: 116.397470
    },
    markers: [],
    polyline: [],
    mapScale: 11,
    currentAttractionId: null,
    movableAttractions: [],
    currentDay: null,
    moving: false,
    dragTargetIndex: null,  // 拖动目标位置
    dragSourceIndex: null,  // 拖动源位置
    dragSourceDay: null     // 拖动源天数
  },

  onLoad() {
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.on('acceptDataFromOpenerPage', (data) => {
      console.log('接收到的数据:', data);
      const { dailyPlans, startDate, endDate } = data;
      
      // 为每个景点添加唯一标识
      const processedDailyPlans = dailyPlans.map(plan => ({
        ...plan,
        attractions: plan.attractions.map((attraction, index) => ({
          ...attraction,
          uniqueId: `${plan.day}-${index}`
        }))
      }));

      this.setData({
        dailyPlans: processedDailyPlans,
        startDate,
        endDate,
        showMap: true
      }, () => {
        this.updateMapData();
        setTimeout(() => {
          this.adjustMapView();
        }, 500);
      });
    });
  },

  // 开始拖动
  dragStart(e) {
    const { day, index } = e.currentTarget.dataset;
    this.setData({
      currentDay: day,
      moving: true,
      dragSourceIndex: index,
      dragSourceDay: day,
      dragTargetIndex: index
    });
  },

  // 拖动中
  dragMove(e) {
    if (!this.data.moving) return;
    
    const { day, index } = e.currentTarget.dataset;
    const { y } = e.detail;
    
    // 计算当前位置对应的索引
    const itemHeight = 180; // 每个景点项的高度
    const currentIndex = Math.floor(y / itemHeight);
    
    // 更新目标位置
    if (currentIndex !== this.data.dragTargetIndex) {
      this.setData({
        dragTargetIndex: currentIndex
      });
    }
  },

  // 结束拖动
  dragEnd() {
    const { dragSourceIndex, dragTargetIndex, dragSourceDay } = this.data;
    
    if (dragSourceIndex !== dragTargetIndex) {
      this.moveAttraction(dragSourceDay, dragSourceIndex, dragTargetIndex);
    }

    this.setData({
      currentDay: null,
      moving: false,
      dragSourceIndex: null,
      dragTargetIndex: null,
      dragSourceDay: null
    });
  },

  // 移动景点
  moveAttraction(day, fromIndex, toIndex) {
    const dailyPlans = [...this.data.dailyPlans];
    const dayPlan = dailyPlans.find(p => p.day === day);
    if (!dayPlan) return;

    const attractions = [...dayPlan.attractions];
    const [movedItem] = attractions.splice(fromIndex, 1);
    attractions.splice(toIndex, 0, movedItem);
    
    dayPlan.attractions = attractions;

    this.setData({ dailyPlans }, () => {
      // 更新距离信息
      this.updateDistances(day);
    });
  },

  // 更新距离信息
  updateDistances(day) {
    const dailyPlans = [...this.data.dailyPlans];
    const dayPlan = dailyPlans.find(p => p.day === day);
    if (!dayPlan) return;

    dayPlan.attractions = dayPlan.attractions.map((attraction, index, arr) => {
      let distance = '';
      if (index < arr.length - 1) {
        distance = this.calculateDistance(
          attraction.location.latitude,
          attraction.location.longitude,
          arr[index + 1].location.latitude,
          arr[index + 1].location.longitude
        );
      }
      return { ...attraction, distance };
    });

    this.setData({ dailyPlans });
  },

  // 更新地图数据
  updateMapData() {
    // 收集所有景点
    const allAttractions = this.data.dailyPlans.reduce((acc, plan) => {
      return [...acc, ...plan.attractions];
    }, []);

    // 更新路线
    const polyline = this.data.dailyPlans.map((plan, dayIndex) => ({
      points: plan.attractions.map(item => ({
        latitude: item.location.latitude,
        longitude: item.location.longitude
      })),
      color: this.getDayColor(dayIndex),
      width: 4,
      dottedLine: true,
      arrowLine: true,
      borderColor: this.getDayColor(dayIndex),
      borderWidth: 1
    }));

    // 更新标记点
    const markers = allAttractions.map((item, index) => ({
      id: index + 1,
      latitude: item.location.latitude,
      longitude: item.location.longitude,
      title: item.name,
      width: 32,
      height: 32,
      callout: {
        content: item.name,
        padding: 8,
        borderRadius: 4,
        display: 'ALWAYS',
        fontSize: 12,
        bgColor: '#ffffff',
        textAlign: 'center',
        borderWidth: 1,
        borderColor: '#1890ff',
        anchorY: -8
      }
    }));

    this.setData({
      markers,
      polyline,
      center: this.calculateCenter(allAttractions)
    });
  },

  // 获取每天的路线颜色
  getDayColor(index) {
    const colors = ['#1890FF', '#13C2C2', '#52C41A', '#FAAD14', '#F5222D'];
    return colors[index % colors.length];
  },

  // 计算中心点
  calculateCenter(attractions) {
    if (!attractions.length) {
      return {
        latitude: 39.908823,
        longitude: 116.397470
      };
    }
    
    const latSum = attractions.reduce((sum, item) => sum + item.location.latitude, 0);
    const lngSum = attractions.reduce((sum, item) => sum + item.location.longitude, 0);
    
    return {
      latitude: latSum / attractions.length,
      longitude: lngSum / attractions.length
    };
  },

  // 调整地图视野
  adjustMapView() {
    if (!this.data.markers.length) return;
    
    const mapCtx = wx.createMapContext('map', this);
    mapCtx.includePoints({
      points: this.data.markers.map(marker => ({
        latitude: marker.latitude,
        longitude: marker.longitude
      })),
      padding: [80, 80, 80, 80]
    });
  },

  // 保存行程
  savePlan() {
    Toast.success('保存成功');
  },

  // 分享行程
  onShareAppMessage() {
    return {
      title: `${this.data.startDate}至${this.data.endDate}的旅行计划`,
      path: '/pages/preview/index'
    };
  },

  // 添加地图显示切换方法
  toggleMap() {
    const showMap = !this.data.showMap;
    this.setData({ showMap }, () => {
      if (showMap) {
        setTimeout(() => {
          this.adjustMapView();
        }, 300);
      }
    });
  },

  // 添加距离计算方法
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半径，单位km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // 距离，单位km

    // 优化距离显示格式
    if (d < 1) {
      const meters = Math.round(d * 1000);
      if (meters < 100) {
        return '很近';
      }
      return `${meters} 米`;
    } else if (d < 10) {
      return `${d.toFixed(1)} 公里`;
    } else {
      return `${Math.round(d)} 公里`;
    }
  },

  deg2rad(deg) {
    return deg * (Math.PI/180);
  },

  // 添加定位方法
  locateAttraction(e) {
    const { latitude, longitude, name } = e.currentTarget.dataset;
    
    if (!this.data.showMap) {
      this.setData({ showMap: true });
    }

    const mapCtx = wx.createMapContext('map', this);
    mapCtx.moveToLocation({
      latitude,
      longitude,
      success: () => {
        this.setData({ mapScale: 15 });
      }
    });

    Toast({
      type: 'success',
      message: `已定位到${name}`,
      duration: 1500
    });
  },

  // 打开导航
  openNavigation(e) {
    const {
      fromLatitude,
      fromLongitude,
      fromName,
      toLatitude,
      toLongitude,
      toName
    } = e.currentTarget.dataset;

    // 直接使用微信内置导航
    wx.openLocation({
      latitude: parseFloat(toLatitude),
      longitude: parseFloat(toLongitude),
      name: toName,
      address: `从 ${fromName} 到 ${toName}`,
      scale: 18
    });
  }
}); 