// 提示词生成参数与结果类型定义
export interface GenerateParams {
  camera: string; // 运镜方式
  lighting: string; // 光线氛围
  shots: string; // 镜头数量
}

export interface GenerateResult {
  // 输出结果的纯文本（用于复制与展示）
  prompt: string;
}

/**
 * 生成结构化视频提示词。
 *
 * 目前返回写死的假数据，用于打通前端结构与视觉。
 *
 * // TODO: 之后替换为真实 API 调用
 */
export async function generatePrompt(
  input: string,
  params: GenerateParams
): Promise<GenerateResult> {
  // 模拟一点网络延迟，方便观察 loading 态
  await new Promise((r) => setTimeout(r, 450));

  const idea =
    input.trim() ||
    "一位骑士独自站在被风暴摧毁的古老城堡废墟上";

  // 写死的多镜头结构化输出（假数据）
  const prompt = `# SCENE: 风暴废墟中的孤骑士
# CONCEPT: ${idea}
# CAMERA: ${params.camera}  LIGHT: ${params.lighting}  SHOTS: ${params.shots}

[SHOT_01] @establishing_shot @wide @drone
主体   一位身披残破铠甲的骑士，独自伫立于城堡废墟顶端
环境   被风暴摧毁的古老城堡，断壁残垣，碎石散落于泥泞之中
运镜   @drone 缓慢自远及近推进，掠过残破的雉堞
光线   @overcast 铅灰色的天空，冷冽的自然光穿透乌云
氛围   苍凉、孤寂、史诗感
时长   4s

[SHOT_02] @medium_shot @tracking @low_angle
主体   骑士侧脸特写转中景，眼神坚定望向远方地平线
环境   狂风卷起碎布与尘土，披风在身后猎猎作响
运镜   @tracking 横向跟随，@low_angle 仰拍强化英雄气质
光线   @rim_light 逆光勾勒出铠甲边缘的金属反光
氛围   凝重、蓄势、命运感
时长   3s

[SHOT_03] @close_up @push_in @shallow_dof
主体   骑士紧握断剑的手部特写，指节因用力而泛白
环境   剑刃残缺，映出破碎天空的倒影
运镜   @push_in 极缓推进，@shallow_dof 背景虚化
光线   @dramatic 侧逆光，明暗对比强烈
氛围   决绝、悲壮、静默的张力
时长   2s

[SHOT_04] @wide @crane_up @establishing_shot
主体   骑士渺小的身影融入宏大的废墟全景
环境   远处乌云翻涌，一道微光刺破风暴的裂缝
运镜   @crane_up 摇臂缓缓升起，拉开天地的尺度
光线   @god_rays 云隙光倾泻而下，落在骑士身上
氛围   希望、崇高、余韵悠长
时长   5s

---
# STYLE
写实电影质感 · 冷暖对比 · 35mm 胶片颗粒 · 景深层次分明
# NEGATIVE
过曝、卡通渲染、多余人物、现代元素、文字水印`;

  return { prompt };
}
