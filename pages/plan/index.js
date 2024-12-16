Page({
  data: {
    attractions: [],
    startDate: '',
    endDate: '',
    days: 1,
    dailyPlans: [],
    today: '',
    showMap: false,
    center: {
      latitude: 39.908823,
      longitude: 116.397470
    },
    markers: [],
    includePoints: [],
    mapScale: 11,
  },

  onLoad() {
    const today = new Date().toISOString().split('T')[0];
    this.setData({ today });

    const eventChannel = this.getOpenerEventChannel();
    eventChannel.on('acceptDataFromOpenerPage', (data) => {
      const attractions = data.attractions;
      
      // 处理地图标记
      const markers = attractions.map((item, index) => ({
        id: index + 1,
        latitude: item.location.latitude,
        longitude: item.location.longitude,
        title: item.name,
        width: 32,
        height: 32,
        callout: {
          content: `${index + 1}. ${item.name}`,
          padding: 8,
          borderRadius: 4,
          display: 'ALWAYS',
          fontSize: 12,
          bgColor: '#ffffff',
          textAlign: 'center',
          borderWidth: 1,
          borderColor: '#1890ff'
        }
      }));

      const center = this.calculateCenter(attractions);
      const includePoints = attractions.map(item => ({
        latitude: item.location.latitude,
        longitude: item.location.longitude
      }));

      this.setData({
        attractions,
        markers,
        center,
        includePoints,
        showMap: true
      }, () => {
        this.adjustMapView();
      });
    });
  },

  // 调整地图视野
  adjustMapView() {
    if (!this.data.showMap || !this.data.includePoints.length) return;
    
    setTimeout(() => {
      const mapCtx = wx.createMapContext('map', this);
      mapCtx.includePoints({
        points: this.data.includePoints,
        padding: [80, 80, 80, 80]
      });
    }, 300);
  },

  // 切换地图显示
  toggleMap() {
    const showMap = !this.data.showMap;
    this.setData({ showMap }, () => {
      if (showMap) {
        this.adjustMapView();
      }
    });
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

  handleStartDateChange(e) {
    const startDate = e.detail.value;
    this.setData({ startDate });
    this.updateDays();
  },

  handleEndDateChange(e) {
    const endDate = e.detail.value;
    this.setData({ endDate });
    this.updateDays();
  },

  updateDays() {
    const { startDate, endDate } = this.data;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      this.setData({ days });
    }
  },

  // 生成行程计划
  generatePlan() {
    if (!this.validateDates()) return;

    const { attractions, days } = this.data;
    const attractionsPerDay = Math.ceil(attractions.length / days);
    
    const dailyPlans = Array.from({ length: days }, (_, dayIndex) => {
      const dayAttractions = attractions.slice(
        dayIndex * attractionsPerDay,
        (dayIndex + 1) * attractionsPerDay
      );

      return {
        day: dayIndex + 1,
        date: this.addDays(new Date(this.data.startDate), dayIndex),
        attractions: dayAttractions.map(attraction => ({
          ...attraction,
          visitTime: '2小时'  // 可以根据实际情况调整
        }))
      };
    });

    this.setData({ dailyPlans });

    // 跳转到预览页面
    wx.navigateTo({
      url: '/pages/preview/index',
      success: (res) => {
        res.eventChannel.emit('acceptDataFromOpenerPage', {
          dailyPlans: this.data.dailyPlans,
          startDate: this.data.startDate,
          endDate: this.data.endDate
        });
      }
    });
  },

  validateDates() {
    const { startDate, endDate } = this.data;
    if (!startDate || !endDate) {
      wx.showToast({
        title: '请选择日期',
        icon: 'none'
      });
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      wx.showToast({
        title: '结束日期不能早于开始日期',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
  },

  // 修改定位方法
  locateAttraction(e) {
    const { latitude, longitude, name } = e.currentTarget.dataset;
    
    // 如果地图未显示，则显示地图
    if (!this.data.showMap) {
      this.setData({ showMap: true }, () => {
        // 等待地图显示后再定位
        setTimeout(() => {
          this.moveToLocation(latitude, longitude);
        }, 300);
      });
    } else {
      this.moveToLocation(latitude, longitude);
    }

    // 显示提示
    wx.showToast({
      title: `已定位到${name}`,
      icon: 'success',
      duration: 1500
    });
  },

  // 添加移动到指定位置的方法
  moveToLocation(latitude, longitude) {
    const mapCtx = wx.createMapContext('map', this);
    
    // 设置地图中心点和缩放级别
    this.setData({
      center: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      mapScale: 15
    });

    // 确保地图更新到指定位置
    mapCtx.includePoints({
      points: [{
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      }],
      padding: [100, 100, 100, 100]
    });
  }
}); 