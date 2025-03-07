// index.js
Page({
  onLoad() {
    this.initCanvas(); // 提前初始化
  },
  data: {
    splitType: 4,        // 当前分割类型
    imagePath: null,     // 图片路径
    canvasWidth: 300,    // 画布宽度
    canvasHeight: 300,   // 画布高度
    originalImage: null  // 原始图片数据
  },

  // 初始化画布
  initCanvas() {
    this.ctx = wx.createCanvasContext('mainCanvas');
    // 初始化默认绘制
    this.ctx.draw(true);
  },

  // 设置分割类型
  setSplitType(e) {
    const type = parseInt(e.currentTarget.dataset.type);
    this.setData({ splitType: type }, () => {
      if (this.data.imagePath) { // 仅在有图片时更新
        this.drawPreview();
      }
    });
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      success: res => this.handleImage(res.tempFilePaths[0])
    });
  },

  // 拍照
  takePhoto() {
    wx.chooseImage({
      sourceType: ['camera'],
      success: res => this.handleImage(res.tempFilePaths[0])
    });
  },

  // 处理图片
  async handleImage(path) {
    wx.showLoading({ title: '加载中...' });
    
    // 获取图片信息
    const { width, height } = await this.getImageInfo(path);
    const ratio = width / height;
    const canvasWidth = 300;
    const canvasHeight = canvasWidth / ratio;

    // 存储原始数据
    this.setData({
      imagePath: path,
      canvasWidth,
      canvasHeight,
      originalImage: { width, height, path }
    }, () => {
      this.initCanvas();
      this.drawPreview();
      wx.hideLoading();
    });
  },

  // 绘制预览（带参考线）
  drawPreview() {
    // 确保用户选了图片
    if (!this.data.imagePath) {
      return;
    };
  
    // 确保canvas上下文存在
    if (!this.ctx) {
      console.warn('Canvas上下文未初始化');
      this.initCanvas();
    };
    this.drawBaseImage();  // 绘制底图
    this.drawGridLines();  // 绘制参考线
    this.ctx.draw(true);  // 立即渲染
  },

  // 绘制底图（不带参考线）
  drawBaseImage() {
    if (!this.ctx || !this.data.imagePath){
      return;
    }
    const { imagePath, canvasWidth, canvasHeight } = this.data;
    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    this.ctx.drawImage(imagePath, 0, 0, canvasWidth, canvasHeight);
  },

  // 绘制参考线
  drawGridLines() {
    const { splitType, canvasWidth, canvasHeight } = this.data;
    const n = Math.sqrt(splitType);
    const sliceWidth = canvasWidth / n;
    const sliceHeight = canvasHeight / n;

    // 样式设置
    this.ctx.setStrokeStyle('rgba(255,0,0,0.6)');
    this.ctx.setLineWidth(2);

    // 绘制垂直线
    for(let i = 1; i < n; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * sliceWidth, 0);
      this.ctx.lineTo(i * sliceWidth, canvasHeight);
      this.ctx.stroke();
    }

    // 绘制水平线
    for(let j = 1; j < n; j++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, j * sliceHeight);
      this.ctx.lineTo(canvasWidth, j * sliceHeight);
      this.ctx.stroke();
    }
  },

  // 保存所有切片
  async saveAllSlices() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '保存中...' });
    
    // 先绘制不带参考线的底图
    this.drawBaseImage();
    this.ctx.draw(true);

    // 开始切片保存
    const { splitType, canvasWidth, canvasHeight } = this.data;
    const n = Math.sqrt(splitType);
    const sliceWidth = canvasWidth / n;
    const sliceHeight = canvasHeight / n;

    for(let row = 0; row < n; row++) {
      for(let col = 0; col < n; col++) {
        await this.saveSingleSlice(col, row, sliceWidth, sliceHeight);
      }
    }

    // 重新绘制参考线
    this.drawPreview();
    wx.hideLoading();
    wx.showToast({ title: '保存完成' });
  },

  // 保存单个切片
  saveSingleSlice(col, row, width, height) {
    return new Promise((resolve) => {
      wx.canvasToTempFilePath({
        x: col * width,
        y: row * height,
        width,
        height,
        canvasId: 'mainCanvas',
        success: async (res) => {
          await this.saveToAlbum(res.tempFilePath);
          resolve();
        }
      });
    });
  },

  // 保存到相册
  saveToAlbum(tempPath) {
    return new Promise((resolve) => {
      wx.saveImageToPhotosAlbum({
        filePath: tempPath,
        success: resolve
      });
    });
  },

  // 获取图片信息
  getImageInfo(path) {
    return new Promise((resolve) => {
      wx.getImageInfo({
        src: path,
        success: (res) => resolve(res)
      });
    });
  }
});