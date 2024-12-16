const { BMapWX } = require('../../utils/bmap-wx.js');
let bmap;

Page({
  data: {
    searchKeyword: '',
    loading: false,
    selectedLocation: null,
    attractions: [],
    selectedAttractions: []
  },

  onLoad() {
    // 初始化百度地图 SDK
    bmap = new BMapWX({
      ak: 'VCUFZ62wpiTB7UB1VLURU2IogfFSzhz2'  // 替换为你申请的百度地图 AK
    });
  },

  handleSearchInput(e) {
    console.log('输入值:', e.detail.value);
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  handleSearch() {
    console.log('开始搜索, 关键词:', this.data.searchKeyword);
    const keyword = this.data.searchKeyword ? this.data.searchKeyword.trim() : '';
    
    if (!keyword) {
      wx.showToast({
        title: '请输入目的地',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '搜索中...' });

    wx.request({
      url: 'https://api.map.baidu.com/place/v2/search',
      data: {
        query: '旅游景点',
        region: keyword,
        scope: 2,
        output: 'json',
        ak: 'VCUFZ62wpiTB7UB1VLURU2IogfFSzhz2',
        page_size: 20
      },
      success: (res) => {
        console.log('搜索结果:', res.data);
        const data = res.data;
        if (data.status === 0 && data.results && data.results.length > 0) {
          const attractions = data.results.map(item => ({
            id: item.uid,
            name: item.name,
            address: item.address,
            type: item.detail_info ? item.detail_info.tag : '景点',
            rating: item.detail_info ? item.detail_info.overall_rating || 0 : 0,
            location: {
              latitude: item.location.lat,
              longitude: item.location.lng
            },
            tel: item.telephone || '',
            price: item.detail_info ? item.detail_info.price || '' : '',
            openingHours: item.detail_info && item.detail_info.open_time ? [item.detail_info.open_time] : [],
            isSelected: false
          }));

          this.setData({
            selectedLocation: {
              id: Date.now().toString(),
              name: keyword,
              address: `${keyword}`,
              location: attractions[0].location
            },
            attractions,
            loading: false
          });
        } else {
          this.setData({ 
            attractions: [],
            loading: false 
          });
          wx.showToast({
            title: '未找到景点',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('搜索失败:', err);
        this.setData({ 
          attractions: [],
          loading: false 
        });
        wx.showToast({
          title: '搜索失败',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  handleAttractionSelect(e) {
    const attraction = e.currentTarget.dataset.attraction;
    const { selectedAttractions } = this.data;
    
    if (!this.isAttractionSelected(attraction.id)) {
      this.setData({
        selectedAttractions: [...selectedAttractions, attraction],
        attractions: this.data.attractions.map(item => 
          item.id === attraction.id 
            ? { ...item, isSelected: true }
            : item
        )
      });
      
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });
    } else {
      this.setData({
        selectedAttractions: selectedAttractions.filter(item => item.id !== attraction.id),
        attractions: this.data.attractions.map(item => 
          item.id === attraction.id 
            ? { ...item, isSelected: false }
            : item
        )
      });

      wx.showToast({
        title: '已移除',
        icon: 'success'
      });
    }
  },

  isAttractionSelected(id) {
    return this.data.selectedAttractions.some(item => item.id === id);
  },

  goToPlan() {
    if (this.data.selectedAttractions.length === 0) {
      wx.showToast({
        title: '请先选择景点',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/plan/index',
      success: (res) => {
        res.eventChannel.emit('acceptDataFromOpenerPage', {
          attractions: this.data.selectedAttractions
        });
      }
    });
  }
}); 