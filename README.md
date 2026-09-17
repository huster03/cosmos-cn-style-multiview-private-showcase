# Cosmos 七视角国内风格基模：Iteration 2000

这是一个私有的静态展示站点，包含
`boshi_1000clips_sevenview_neighbor_i2v_v2` 在第 2,000 步生成的五条固定推理结果。

## 内容

- 模型任务：七视角 image-to-video
- 多视角机制：每个视角与自身及左右相邻视角交互
- 文本条件：不使用
- 展示样例：5 条七视角拼接视频
- 页面入口：`index.html`

## 视频映射

| 展示文件 | 原推理样本目录 |
|---|---|
| `videos/sample-01.mp4` | `00000_dynamic_3d_t_attr_modify__13dcda84fdca1439a0b33b9493ff6e7e__val__000135` |
| `videos/sample-02.mp4` | `00001_dynamic_3d_t_attr_modify__5d2db0be819aba91be770730c2f79c8a__val__000135` |
| `videos/sample-03.mp4` | `00002_dynamic_3d_t_attr_modify__699752d046d5cc078286db2d3987114b__val__000135` |
| `videos/sample-04.mp4` | `00003_dynamic_3d_t_attr_modify__73b0c19419da1bb2c48ec31eb92cafd3__val__000135` |
| `videos/sample-05.mp4` | `00004_dynamic_3d_t_attr_modify__9c7e93b9b84def26d40be78139b50615__val__000135` |

## 本地查看

```bash
python3 -m http.server 8000
```

浏览器访问 <http://127.0.0.1:8000/>。

> 本仓库包含内部实验结果，请保持仓库为 Private。
