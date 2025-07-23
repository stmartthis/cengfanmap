// 初始化变量
let map, placeSearch;
let currentMode = 'guest';
let studentData = {};
let currentSearchResults = [];
let markers = [];
let provinces = new Set();
let geocoder = new AMap.Geocoder({
    radius: 1000, // 搜索半径
    extensions: "all"
});
let infoWindow; // 用于存储当前打开的信息窗口
let selectedIndex=0;
let isMarkerColored = {};
// let markerClusterer; 
// let tprovince='';

// function getProvince(lnglat) {
//     geocoder.getAddress(lnglat, (status, result) => {
//         // console.log(result.regeocode);
//         if (status === 'complete' && result.regeocode) {
//             tprovince = result.regeocode.addressComponent.province;
//             console.log()
//             // resolve(province);
//         } else {
//             tprovince='未知';
//         }
//     });
//     console.log(tprovince);
// }

// 全局变量：存储省份边界数据和热力图层
// let provinceBoundaryData = {};
// let heatmapLayer = null;

// // 初始化热力图层
// function initHeatmapLayer() {
//     // 清除旧图层
//     if (heatmapLayer) {
//         heatmapLayer.setMap(null);
//     }
    
//     // 获取学生数据中的省份及其人数
//     const provinceData = getProvincePopulationData();
    
//     // 计算颜色映射（人数越多，颜色越深）
//     const colorMap = calculateColorMap(provinceData);
    
//     // 创建省级图层
//     heatmapLayer = new AMap.DistrictLayer.Country({
//         zIndex: 5,
//         SOC: 'CHN', // 中国
//         depth: 1, // 显示省级
//         styles: {
//             'nation-stroke':'#999f9fff',
            
//         }
//     });
    
//     heatmapLayer.setMap(map);
// }

// // 获取各省学生人数数据
// function getProvincePopulationData() {
//     const result = {};
    
//     // 遍历学生数据，统计各省人数
//     Object.values(studentData).forEach(student => {
//         if (student.province) {
//             result[student.province] = (result[student.province] || 0) + 1;
//         }
//     });
    
//     return result;
// }

// // 计算颜色映射
// function calculateColorMap(provinceData) {
//     const colorMap = {};
    
//     // 获取最大人数
//     const maxPopulation = Math.max(...Object.values(provinceData));
    
//     // 定义蓝色渐变（从浅到深）
//     const minBlue = 180; // 最浅的蓝色值
//     const maxBlue = 255; // 最深的蓝色值
    
//     // 为每个省份计算对应的颜色
//     Object.keys(provinceData).forEach(province => {
//         const population = provinceData[province];
//         // 计算颜色强度（0-1之间）
//         const intensity = Math.min(1, population / maxPopulation);
//         // 计算蓝色值（人数越多，蓝色越深）
//         const blueValue = Math.floor(minBlue + (maxBlue - minBlue) * (1 - intensity));
//         // 生成RGBA颜色（透明度固定）
//         colorMap[province] = `rgba(100, 100, ${blueValue}, 0.5)`;
//     });
    
//     return colorMap;
// }

// // 辅助函数：找到匹配的省份名称（处理可能的名称差异）
// function findMatchingProvinceName(fullName, validSimplifiedNames) {
//     // 去除全称中的后缀（如"省"、"自治区"等），得到简化名
//     console.log(fullName);
//     const simplified = fullName.replace(/省|市|自治区|特别行政区/g, '');
//     // 直接与数据中的简化名对比
//     return validSimplifiedNames.includes(simplified) ? simplified : null;
// }

// // 在数据加载完成后调用此函数更新热力图
// function updateHeatmap() {
//     if (!map) return;
//     initHeatmapLayer();
// }

// 初始化地图
function initMap() {
    map = new AMap.Map('mapContainer', {
        viewMode: '3D',
        zoom: 4,
        center: [104.06, 35.86]
    });
    
    // 初始化地点搜索插件
    placeSearch = new AMap.PlaceSearch();
    
    // 加载中国省级行政区边界
    new AMap.DistrictLayer.Province({
        zIndex: 10,
        adcode: '100000',
        depth: 1,
        styles: {
            fill: 'rgba(100, 150, 200, 0.2)',
            stroke: '#1a5fb4'
        }
    }).setMap(map);
    
    // 添加缩放控件
    map.addControl(new AMap.Scale());
    map.addControl(new AMap.ToolBar());
    // updateHeatmap();
}



// 搜索大学
function searchUniversity() {
    const keyword = document.getElementById('universitySearch').value.trim();
    if (!keyword) return;
    
    const resultList = document.getElementById('resultList');
    resultList.innerHTML = '<div class="result-item">搜索中...</div>';
    if (currentMode === 'guest') {
        // 游客模式：搜索同学
        resultList.innerHTML = '';
        const results = Object.entries(studentData)
            .filter(([name, data]) => name.includes(keyword) || data.university.includes(keyword))
            .map(([name, data]) => `
                <div class="result-item" data-name="${name}">
                    <h3>${name}</h3>
                    <p>${data.university} (${data.province || '未知省份'})</p>
                </div>
            `);
        
        resultList.innerHTML = results.join('') || '<div class="result-item">未找到匹配同学</div>';
    } else {
        // 开发者模式：原始大学搜索
        placeSearch.search(keyword, (status, result) => {
            if (status === 'complete' && result.poiList?.pois) {
                currentSearchResults = result.poiList.pois;
                displayResults(currentSearchResults);
            } else {
                resultList.innerHTML = '<div class="result-item">未找到相关大学</div>';
            }
        });
    }
}

// 显示搜索结果
function displayResults(results) {
    const resultList = document.getElementById('resultList');
    resultList.innerHTML = '';
    
    results.forEach((poi, index) => {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
            <h3>${poi.name}</h3>
            <p>${poi.address}</p>
        `;
        item.dataset.index = index; // 正确设置当前项的索引
        
        item.addEventListener('click', () => {
            // 关键：根据点击项的索引获取对应的POI
            selectedIndex=index;
            const selectedPoi = results[index]; // 直接使用当前循环的results和index
            map.setCenter(selectedPoi.location);
            map.setZoom(15);
            
            clearMarkers(); // 清除旧标记
            
            // 创建当前选中项的标记
            const marker = new AMap.Marker({
                position: selectedPoi.location,
                map: map,
                content: `<div style="background: #ff7e5f; color: white; padding: 5px 10px; border-radius: 12px; font-weight: bold; border: 2px solid white;">
                    ${selectedPoi.name}
                </div>`
            });
            markers.push(marker);
            
            // 关键：更新currentSearchResults为当前搜索结果（供添加同学时使用）
            currentSearchResults = results;
        });
        
        resultList.appendChild(item);
    });
}

// 添加同学
function addStudent() {
    const name = document.getElementById('studentName').value.trim();
    const province = document.getElementById('provinceInput').value.trim(); // 获取省份
    if (!name) {
        alert('请输入同学姓名');
        return;
    }

    if(!province){
        alert('请输入同学省份');
        return;
    }
    
    if (!currentSearchResults.length) {
        alert('请先搜索并选择一个大学位置');
        return;
    }
    
    // 获取用户选择的大学（默认为第一个结果）
    // const selectedIndex = 0;
    const selectedPoi = currentSearchResults[selectedIndex];
    // console.log(selectedPoi.address);
    // getProvince(selectedPoi.location);
    // console.log(tprovince);
    
    // 添加到数据
    studentData[name] = {
        lnglat: [selectedPoi.location.lng, selectedPoi.location.lat],
        university: selectedPoi.name,
        address: selectedPoi.address,
        province: province,
        message: "" // 新增
    };
    // console.log(selectedPoi.province+"1")
    
    // 创建标记
    // addStudentMarker(name, studentData[name]);
    
    // 更新列表
    updateStudentList();
    selectedIndex=0;
    // console.log(isMarkerColored);
    
    // 保存数据
    saveData();
    
    // 清空表单
    // 清空表单
    document.getElementById('studentName').value = '';
    document.getElementById('provinceInput').value = ''; // 清空省份输入
}

// 添加同学标记
// function addStudentMarker(name, data) {
//     // 清除其他标记
//     // clearMarkers();
    
//     const marker = new AMap.Marker({
//         position: data.lnglat,
//         map: map,
//         content: `<div style="background: #28a745; color: white; padding: 5px 10px; border-radius: 12px; font-weight: bold; border: 2px solid white; min-width: 120px; text-align: center;">
//             ${name}<br>${data.university}
//         </div>`
//     });
    
//     markers.push(marker);
//     map.setCenter(data.lnglat);
//     map.setZoom(15);
    
//     // 添加到省份集合
//     if (data.province) {
//         provinces.add(data.province);
//         updateStats();
//     }
// }

function addProvinceMarker(province, universities, lnglat) {
    if(provinces.has(province) && isMarkerColored[province]) return;
    isMarkerColored[province]=1;
    // 实际省份地理位置（曲线起点）
    const actualPosition = lnglat;
    // 计算标记显示位置（偏离实际位置）
    const offsetX = (Math.random()-0.5)*25; // 经度偏移量（可调整）
    const offsetY = (Math.random()-0.5)*25; // 纬度偏移量（可调整）
    const markerPosition = [lnglat[0] + offsetX, lnglat[1] + offsetY];
    // 计算该省份的学生总数和大学数量
    let studentCount = 0;
    const universityCount = Object.keys(universities).length;
    
    Object.values(universities).forEach(students => {
        studentCount += students.length;
    });

    // 创建可拖拽的省份聚合标记
    const marker = new AMap.Marker({
        position: markerPosition,
        map: map,
        content: `
            <div class="province-marker">
                <div class="province-name">${province}</div>
                <div class="stats">
                    <span><i class="fas fa-university"></i> ${universityCount}校</span>
                    <span><i class="fas fa-user-graduate"></i> ${studentCount}人</span>
                </div>
            </div>
        `,
        offset: new AMap.Pixel(0, -30),
        draggable: true, // 启用拖拽功能
        cursor: 'move'   // 拖拽时显示移动光标
    });

    // 绘制连接实际位置和标记位置的曲线
    const controlPoint = [
        (actualPosition[0] + markerPosition[0]) / 2, // 控制点X坐标在两者中间
        (actualPosition[1] + markerPosition[1]) / 2 + 0.5 // 控制点Y坐标上移（可调整）
    ];
    
    const path = bezierCurve(actualPosition, controlPoint, markerPosition);
    const curve = new AMap.Polyline({
        path: path,
        strokeColor: "#1a5fb4",
        strokeWeight: 5,
        // strokePattern: 'dotted',
        strokeStyle : 'dashed',
        strokeOpacity: 0.8,
        lineJoin: 'round',
        lineCap: 'round',
        zIndex: 50
    });
    // curve.setDottedLine(1);
    curve.setMap(map);

    // 保存标记和曲线的关联关系（用于拖拽后更新曲线）
    marker.curve = curve;

    // 监听标记拖拽结束事件，更新曲线
    marker.on('dragend', function(e) {
        const newPosition = e.lnglat;
        const newControlPoint = [
            (actualPosition[0] + newPosition.getLng()) / 2,
            (actualPosition[1] + newPosition.getLat()) / 2 + 0.5
        ];
        
        // 更新曲线路径
        const newPath = bezierCurve(
            actualPosition,
            newControlPoint,
            [newPosition.getLng(), newPosition.getLat()]
        );
        this.curve.setPath(newPath);
    });


    marker.on('click', () => {
        map.setCenter(lnglat);
        map.setZoom(8);
        
        if (window.infoWindow) {
            infoWindow.close();
        }
        
        // 创建学校列表信息窗口
        const infoContent = `
            <div class="map-infowindow">
                <h3>${province} · 同学分布</h3>
                <ul class="school-list">
                    ${Object.entries(universities).map(([univ, students]) => `
                        <li data-university="${univ}">
                            <i class="fas fa-school"></i> 
                            ${univ} 
                            <span class="student-count">${students.length}人</span>
                            <div class="student-list" style="display:none">
                                ${students.map(student => `
                                    <div class="student-item" data-name="${student}">
                                        ${student}
                                        ${studentData[student].message ? `<div class="student-message">${studentData[student].message}</div>` : ''}
                                        <button class="btn-locate-small">
                                            <i class="fas fa-location-arrow"></i>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        
        infoWindow = new AMap.InfoWindow({
            content: infoContent,
            offset: new AMap.Pixel(0, -40),
            autoMove: true
        });
        markers.push(marker);
        
        // 添加学校点击事件
        setTimeout(() => {
            document.querySelectorAll('.school-list li').forEach(li => {
                li.addEventListener('click', (e) => {
                    // 防止点击学生项时触发
                    if (e.target.closest('.btn-locate-small')) return;
                    
                    const studentList = li.querySelector('.student-list');
                    if (studentList) {
                        // 切换显示/隐藏学生列表
                        studentList.style.display = 
                            studentList.style.display === 'none' ? 'block' : 'none';
                        
                        // 如果是显示状态，定位到该学校
                        if (studentList.style.display === 'block') {
                            const firstStudent = studentData[students[0]];
                            map.setCenter(firstStudent.lnglat);
                            map.setZoom(15);
                        }
                    }
                });
            });
            
            // 添加学生定位按钮事件
            document.querySelectorAll('.btn-locate-small').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const name = btn.closest('.student-item').dataset.name;
                    locateStudent(name);
                });
            });
        }, 100);
        
        infoWindow.open(map, actualPosition);
    });
     
}

function bezierCurve(start, control, end) {
    const points = [];
    for (let t = 0; t <= 1; t += 0.01) {
        const x = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * control[0] + t * t * end[0];
        const y = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * control[1] + t * t * end[1];
        points.push([x, y]);
    }
    return points;
}

// 添加学校标记
// function addSchoolMarker(school, names, data) {
//     const marker = new AMap.Marker({
//         position: data.lnglat,
//         map: map,
//         content: `<div style="background: #28a745; color: white; padding: 5px 10px; border-radius: 12px; 
//                 font-weight: bold; border: 2px solid white; min-width: 120px; text-align: center;">
//             <div>${data.province || '未知省份'}</div>
//             <div>${school}</div>
//             <div>${names.length}位同学</div>
//         </div>`
//     });
    
//     // 添加点击事件
//     marker.on('click', () => {
//         map.setCenter(data.lnglat);
//         map.setZoom(15);
//     });
    
//     markers.push(marker);
// }

// 清除地图标记
function clearMarkers() {
    // 确保完全清除所有标记
    markers.forEach(marker => {
        marker.setMap(null);
        marker.off('click'); // 移除事件监听
    });
    markers = [];
    
    // 关闭可能打开的信息窗口
    if (infoWindow) {
        infoWindow.close();
        infoWindow = null;
    }
}

// 更新学生列表
function updateStudentList() {
    clearMarkers();

    // 创建省份容器时确保有滚动类
    const provinceItem = document.createElement('div');
    provinceItem.className = 'province-item'; // 已经包含滚动样式
    
    // 大学容器
    const universitiesContainer = document.createElement('div');
    universitiesContainer.className = 'universities-container';
    
    // 学生容器
    const studentsContainer = document.createElement('div');
    studentsContainer.className = 'students-container';
    studentList.innerHTML = '';
    
    if (Object.keys(studentData).length === 0) {
        studentList.innerHTML = '<div class="no-data">暂无同学数据</div>';
        return;
    }

    // 按省份分组
    const provinceGroups = {};
    Object.entries(studentData).forEach(([name, data]) => {
        const province = data.province || '未知省份';
        if (!provinceGroups[province]) {
            provinceGroups[province] = {
                universities: {},
                lnglat: data.lnglat // 记录省份位置
            };
        }
        
        const university = data.university || '未知学校';
        if (!provinceGroups[province].universities[university]) {
            provinceGroups[province].universities[university] = [];
        }
        
        provinceGroups[province].universities[university].push(name);
    });

    // 清除现有标记
    clearMarkers();

    // console.log(provinceGroups);
    // 创建省份分组
    Object.entries(provinceGroups).forEach(([province, data]) => {
        console.log(province);
        const provinceItem = document.createElement('div');
        provinceItem.className = 'province-item';
        
        // 省份标题
        const provinceHeader = document.createElement('div');
        provinceHeader.className = 'province-header';
        provinceHeader.innerHTML = `
            <h3 class="province-title">
                <i class="fas fa-map-marker-alt"></i> ${province}
                <span class="student-count">${Object.values(data.universities).flat().length}人</span>
            </h3>
        `;
        
        // 大学列表
        const universitiesContainer = document.createElement('div');
        universitiesContainer.className = 'universities-container';
        
        Object.entries(data.universities).forEach(([university, students]) => {
            // 大学项
            const universityItem = document.createElement('div');
            universityItem.className = 'university-item';
            
            // 大学标题
            const universityHeader = document.createElement('div');
            universityHeader.className = 'university-header';
            universityHeader.innerHTML = `
                <h4 class="university-title">
                    <i class="fas fa-school"></i> ${university}
                    <span class="student-count">${students.length}人</span>
                </h4>
            `;
            
            // 学生列表
            const studentsContainer = document.createElement('div');
            studentsContainer.className = 'students-container';
            
            students.forEach(student => {
                const studentElement = document.createElement('div');
                studentElement.className = 'student-item';
                studentElement.innerHTML = `
                    <span class="student-name">${student}</span>
                    ${studentData[student].message ? `<div class="student-message">${studentData[student].message}</div>` : ''}
                    <div class="student-actions">
                        <button class="btn-locate" data-name="${student}">
                            <i class="fas fa-location-arrow"></i>
                        </button>
                        <button class="btn-message" data-name="${student}" 
                            style="display: ${currentMode === 'developer' ? 'inline-block' : 'none'}">
                        <i class="fas fa-comment"></i>
                        <button class="btn-delete" data-name="${student}" 
                            style="display: ${currentMode === 'developer' ? 'inline-block' : 'none'}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                studentsContainer.appendChild(studentElement);
            });
            
            universityItem.appendChild(universityHeader);
            universityItem.appendChild(studentsContainer);
            universitiesContainer.appendChild(universityItem);
        });
        
        provinceItem.appendChild(provinceHeader);
        provinceItem.appendChild(universitiesContainer);
        studentList.appendChild(provinceItem);
        
        // 添加省份标记
        addProvinceMarker(province, data.universities, data.lnglat);
        
        // 省份点击事件
        provinceHeader.addEventListener('click', () => {
            map.setCenter(data.lnglat);
            map.setZoom(2);
        });
    });
}

// 定位学生
function locateStudent(name) {
    const data = studentData[name];
    if (data) {
        map.setCenter(data.lnglat);
        map.setZoom(13);
    }
}

// 删除学生
function deleteStudent(name) {
    if (!confirm(`确定删除 ${name} 吗？`)) return;
    
    // 先获取要删除同学的省份
    const deletedProvince = studentData[name]?.province;
    
    // 删除数据
    delete studentData[name];
    // 更新省份集合
    if (deletedProvince) {
        // 检查该省份是否还有其他同学
        const hasProvince = Object.values(studentData).some(
            student => student.province === deletedProvince
        );
        if (!hasProvince) {
            provinces.delete(deletedProvince);
            isMarkerColored[deletedProvince]=0;
        }
    }
    // clearMarkers();
    updateStudentList();
    clearMarkers();
    updateStudentList();
    
    updateStats();
    saveData();
}

// 更新统计信息
function updateStats() {
    // 动态重建统计（不再依赖缓存）
    const studentCount = Object.keys(studentData).length;
    const universityCount = new Set(
        Object.values(studentData).map(s => s.university)
    ).size;
    
    // 实时计算省份（更可靠）
    const currentProvinces = new Set(
        Object.values(studentData)
            .map(s => s.province)
            .filter(Boolean)
    );
    
    // 更新显示
    document.getElementById('studentCount').textContent = studentCount;
    document.getElementById('universityCount').textContent = universityCount;
    document.getElementById('provinceCount').textContent = currentProvinces.size;
    
    // 同步provinces集合
    provinces = currentProvinces;
    // for (let province of provinces) 
    //     // 将省份作为键，0 作为值添加到 isMarkerColored 对象中
    //     isMarkerColored[province] = 0;
}

// 切换模式
function toggleMode() {
    currentMode = currentMode === 'guest' ? 'developer' : 'guest';
    const modeToggle = document.getElementById('modeToggle');
    const devForm = document.getElementById('devForm');
    const dataManagementPanel = document.querySelector('.panel:last-child'); // 只选择数据管理面板
    
    // if (currentMode === 'developer') {
    //     searchTitle.textContent = '搜索大学';
    //     universitySearch.placeholder = '搜索大学名称...';
    //     modeToggle.innerHTML = '<i class="fas fa-code"></i> 开发者模式';
    //     modeToggle.classList.add('developer');
    //     devForm.style.display = 'flex';
    //     dataManagementPanel.style.display = 'block'; // 只显示数据管理面板
        
    //     // 显示所有删除按钮
    //     document.querySelectorAll('.btn-delete').forEach(btn => {
    //         btn.style.display = 'block';
    //     });
    //     updateStudentList();
    // } else {
    //     searchTitle.textContent = '搜索同学'; 
    //     modeToggle.innerHTML = '<i class="fas fa-user"></i> 游客模式';
    //     modeToggle.classList.remove('developer');
    //     devForm.style.display = 'none';
    //     dataManagementPanel.style.display = 'none'; // 只隐藏数据管理面板
    //     universitySearch.placeholder = '搜索同学姓名...';
        
    //     // 隐藏所有删除按钮
    //     document.querySelectorAll('.btn-delete').forEach(btn => {
    //         btn.style.display = 'none';
    //     });
    //     updateStudentList();
    // }
}
// 导出数据
function exportData() {
    const dataStr = JSON.stringify(studentData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = '蹭饭图数据.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// 导入数据
function importData() {
    document.getElementById('importFile').click();
}

// 处理导入文件
function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            studentData = data;
            
            // 更新省份集合
            provinces = new Set();
            for (const student of Object.values(studentData)) {
                if (student.province) {
                    provinces.add(student.province);
                }
            }
            
            updateStudentList();
            saveData();
            alert('数据导入成功！');
        } catch (error) {
            alert('导入失败：文件格式不正确');
            console.error(error);
        }
    };
    reader.readAsText(file);
}

// 保存数据（生成 JSON 文件供下载）
function saveData() {
    const data = JSON.stringify({
        studentData,
        provinces: Array.from(provinces)
    }, null, 2);
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cengfan-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('数据已导出为 JSON 文件，请保存到本地');
}

// 从静态 JSON 加载数据
async function loadData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        
        studentData = data.studentData || {};
        provinces = new Set(data.provinces || []);
        
        updateStats();
        updateStudentList();
        console.log("数据已从 data.json 加载");
    } catch (error) {
        console.error("加载数据失败:", error);
        alert("数据加载失败，将使用空数据");
        studentData = {};
        provinces = new Set();
        updateStudentList();
    }
}

// 初始化事件监听
function initEvents() {
    document.getElementById('searchBtn').addEventListener('click', searchUniversity);
    document.getElementById('addBtn').addEventListener('click', addStudent);
    document.getElementById('modeToggle').addEventListener('click', toggleMode);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', importData);
    document.getElementById('importFile').addEventListener('change', handleFileImport);
    
    // 回车键触发搜索
    document.getElementById('universitySearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchUniversity();
    });
    // 修改结果点击事件
    document.getElementById('resultList').addEventListener('click', (e) => {
        const item = e.target.closest('.result-item');
        if (!item) return;

        if (currentMode === 'guest') {
            // 游客模式：定位到同学
            const name = item.dataset.name;
            locateStudent(name);
        } else {
            // 开发者模式：原始逻辑
            const index = item.dataset.index;
            // centerOnPoi(currentSearchResults[index]);
        }
    });
    // 使用事件委托处理所有操作
    document.getElementById('studentList').addEventListener('click', (e) => {
        // 定位单个学生
        if (e.target.closest('.btn-locate')) {
            const name = e.target.closest('.btn-locate').dataset.name;
            locateStudent(name);
        }

        // 添加/修改毕业寄语
        if (e.target.closest('.btn-message')) {
            const name = e.target.closest('.btn-message').dataset.name;
            const message = prompt("请输入" + name + "的毕业寄语:", studentData[name].message || "");
            if (message !== null) {
                studentData[name].message = message;
                saveData();
                updateStudentList();
            }
        }
        
        // 删除单个学生
        if (e.target.closest('.btn-delete')) {
            const name = e.target.closest('.btn-delete').dataset.name;
            deleteStudent(name);
        }
    });
    
}

// 初始化应用
window.onload = () => {
    initMap();
    loadData();
    initEvents();
    currentMode = 'developer'; // 强制设为游客模式
    toggleMode(); // 应用模式切换
    updateStats();
    updateStudentList();
};
//页面卸载
window.addEventListener('beforeunload', () => {
    if (infoWindow) {
        infoWindow.close();
    }
});