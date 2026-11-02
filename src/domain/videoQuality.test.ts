import { describe,expect,it } from 'vitest';
import { playbackRateSample } from './videoQuality';
import { defaultAppearance,glassSettings } from './appearance';
describe('壁纸帧计数与效果档位',()=>{
  it('实际采样60帧源不丢帧时估算30fps，而非承诺60fps',()=>expect(playbackRateSample({timeMs:0,total:100,dropped:0},{timeMs:2000,total:160,dropped:0})).toEqual({fps:30,dropPercent:0}));
  it('从帧数中排除丢帧',()=>expect(playbackRateSample({timeMs:0,total:100,dropped:5},{timeMs:2000,total:220,dropped:17})).toEqual({fps:54,dropPercent:10}));
  it('无进帧时返回0，不除零',()=>expect(playbackRateSample({timeMs:0,total:100,dropped:5},{timeMs:2000,total:100,dropped:5})).toEqual({fps:0,dropPercent:0}));
  it('重新载入、短采样或损坏计数不能显示误导数字',()=>{
    const before={timeMs:1000,total:100,dropped:5};
    for(const after of [{timeMs:3000,total:10,dropped:0},{timeMs:1100,total:110,dropped:5},{timeMs:3000,total:110,dropped:30},{timeMs:NaN,total:110,dropped:5}])expect(playbackRateSample(before,after)).toBeNull();
  });
  it('旧外观数据默认变为透明54%且8px毛玻璃，不改动原对象',()=>{const before=structuredClone(defaultAppearance);expect(glassSettings(defaultAppearance)).toMatchObject({mode:'balanced',opacity:.54,blur:8});expect(defaultAppearance).toEqual(before)});
  it('流畅优先限制卡片模糊并省去视频全屏模糊，质感保留配置',()=>{
    expect(glassSettings({...defaultAppearance,blur:16,glassBlur:18,renderMode:'smooth'})).toMatchObject({blur:4,videoBlur:0});
    expect(glassSettings({...defaultAppearance,blur:16,glassBlur:18,renderMode:'detail'})).toMatchObject({blur:18,videoBlur:16});
  });
});
