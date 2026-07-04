// 参数设置的可选项配置

export const CAMERA_OPTIONS = [
  "固定镜头",
  "平移",
  "推进",
  "拉远",
  "跟随",
  "环绕",
  "摇臂",
  "航拍",
] as const;

export const LIGHTING_OPTIONS = [
  "自然光",
  "黄金时刻",
  "蓝调时刻",
  "戏剧光",
  "低光",
  "逆光",
  "柔光",
  "霓虹",
] as const;

export const SHOTS_OPTIONS = [
  "单镜头",
  "双镜头",
  "三镜头",
  "四镜头",
  "五镜头及以上",
] as const;

export const MAX_INPUT = 200;
