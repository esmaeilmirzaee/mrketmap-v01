import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    select,
    descendants,
    line,
    treemap,
    hierarchy,
    scaleTime,
    scaleLinear,
    scaleOrdinal,
    min,
    max,
} from 'd3';

const drawLineChart = (data: any, ref: HTMLDivElement) => {
    console.log(data);
    let canvas = select(ref);
    let svg = canvas
        .append('svg')
        .attr('width', 100)
        .attr('height', 40)
        .append('g');
    let x = scaleLinear().domain([0, data.length]).range([0, 100]);
    let y = scaleLinear()
        .domain([min(data, (d) => d), max(data, (d) => d)])
        .range([40, 0]);

    svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 1.5)
        .attr(
            'd',
            line()
                .x(function (d, i, n) {
                    return x(i);
                })
                .y(function (d) {
                    return y(d);
                }),
        );
};

const drawMarket = (
    ref: HTMLDivElement,
    data: any,
    size = { w: 1200, h: 960, m: { t: 40, r: 10, b: 10, l: 40 } },
) => {
    const canvas = select(ref);

    if ([...canvas.selectAll('svg')].length > 0) {
        console.log('Clearing');
        // canvas.selectAll('svg').remove();
    }
    const gW = size.w - size.m.l - size.m.r;
    const gH = size.h - size.m.t - size.m.b;
    const svg = canvas
        .append('svg')
        .attr('width', size.w)
        .attr('height', size.h);

    const g = svg
        .append('g')
        .attr('width', gW)
        .attr('height', gH)
        .style('font-family', 'Neuton')
        .style('font-weight', 500)
        .attr('transform', `translate(${size.m.l},${size.m.t})`);

    const rootData = hierarchy(data.sec);
    rootData.eachAfter((d) => {
        if (!d.hasOwnProperty('children')) {
            d.value = d.data.value;
        } else {
            d.value = 0;
            for (var i in d.children) {
                d.value +=
                    d.depth === 3
                        ? d.children[i].value + 50
                        : d.children[i].value;
            }
        }
    });
    treemap()
        .round(false)
        .size([gW, gH])
        .paddingOuter(0)
        .paddingInner(0)
        .paddingTop(19)(rootData);

    let color = scaleLinear()
        .domain([-3, 0, 3])
        .range(['rgb(243, 43, 2)', '#2A2C36', 'rgb(43, 253, 2)']);

    g.selectAll('rect')
        .data(rootData.descendants())
        .enter()
        .append('rect')
        .attr('id', (d) => (d.id = d.data.name))
        .attr('x', (d) => d.x0)
        .attr('y', (d) => d.y0)
        .attr('width', (d) => d.x1 - d.x0)
        .attr('height', (d) => d.y1 - d.y0)
        .attr('stroke', 'white')
        .attr('fill', (d) =>
            d.depth === 3
                ? color(data.map[d.data.name])
                : d.depth === 0
                ? 'white'
                : d.depth === 1
                ? '#2A2C36CC'
                : '#020616',
        );

    g.append('g')
        .selectAll('text')
        .data(rootData.descendants())
        .join('text')
        .text((d) =>
            d.x1 - d.x0 < 50 || d.y1 - d.y0 < 50
                ? ''
                : d.data.name.length > (d.x1 - d.x0) / 8
                ? d.data.name.slice(0, 5)
                : d.data.name,
        )
        .attr('dx', (d) => d.x0 + 3)
        .attr('y', (d) => d.y0 + 15)
        .attr('transform', (d) =>
            d.depth === 3
                ? `translate(${(d.x1 - d.x0) / 4}, ${(d.y1 - d.y0) / 4})`
                : '',
        )
        .attr('fill', (d) => (d.depth === 2 ? 'white' : 'white'))
        .attr('font-weight', (d) => (d.depth === 3 ? 700 : 900))
        .attr('data-id', (d) => d.data.name)
        .style('pointer-events', 'none');

    // Interaction
    svg.selectAll('rect')
        .on('mouseover', (e, d) => {
            if (d.depth < 3) return;
            // let parentNode = document.getElementById(d.parent.id);
            // let parentNodeTitle = document.body.querySelectorAll(
            //     `[data-id=${d.parent.id}]`,
            // );
            // if (parentNode !== null) {
            //     parentNode.style.fill = '#ff0';
            //     parentNode.style.stroke = '#0ff';

            //     if (parentNodeTitle !== null) {
            //         parentNodeTitle[0].style.fill = 'black';
            //         console.log(parentNodeTitle);
            //     }
            // }
            let tooltip;
            if (document.querySelectorAll('#svg-tooltip')) {
                tooltip = document.querySelectorAll('#svg-tooltip');
            }
            tooltip = document.createElement('div');
            tooltip.id = 'svg-tooltip';
            let outerDiv = document.createElement('div');
            let titleDiv = document.createElement('div');
            titleDiv.classList.add('tooltip-title');
            titleDiv.innerText = d.parent.data.name;
            outerDiv.appendChild(titleDiv);
            let sortedChildren = d.parent.data.children.filter(
                (item) => item.name !== d.data.name,
            );
            [d.data, ...sortedChildren].map((item, idx) => {
                let ref = document.createElement('div');
                ref.id = `${idx}`;
                drawLineChart(data.sparklines['AESE'], ref);
                let innerDiv = document.createElement('div');
                innerDiv.classList.add('svg-innerdiv');
                innerDiv.innerHTML = `<div class='svg-innerrow'><div>${
                    item.name
                }</div><div class='svg-description'>${
                    d.data.name === item.name ? item.description : ''
                }</div></div><div></div><div class='svg-innerrow'>$${
                    item.value
                }</div><div class='svg-innerrow'>${data.map[item.name]}</div>`;

                // outerDiv.appendChild(innerDiv);
                outerDiv.appendChild(ref);
            });

            tooltip.appendChild(outerDiv);
            tooltip.classList.add('tooltip');
            tooltip.style.opacity = '1';
            tooltip.style.top = `${e.y - 50}px`;
            tooltip.style.left =
                e.pageX < 1000 ? `${e.pageX + 50}px` : `${e.pageX - 400}px`;

            tooltip.appendChild(ref);
            let portal = document.getElementById('portal');
            if (portal !== null) {
                portal.appendChild(tooltip);
            }
        })
        .on('mouseleave', (e, d) => {
            document.getElementById('svg-tooltip')?.remove();
            // let parentNode = document.getElementById(d.parent.id);
            // let parentNodeTitle = document.body.querySelectorAll(
            //     `[data-id=${d.parent.id}]`,
            // );
            // if (parentNode !== null) {
            //     parentNode.style.fill = '#2A2C36';
            //     parentNode.style.stroke = 'white';

            //     if (parentNodeTitle !== null) {
            //         parentNodeTitle[0].style.fill = 'white';
            //         console.log(parentNodeTitle);
            //     }
            // }
        });
};

export const MarketMap = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [market, setMarket] = useState({});

    // fetch data
    useEffect(() => {
        const controller = new AbortController();
        console.log('text');
        const fetchData = async () => {
            let sec = await axios.get('http://localhost:3000/sec', {
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
            });

            let map = await axios.get('http://localhost:3000/map', {
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
            });

            let sparklines = await axios.get(
                'http://localhost:3000/sparklines',
                {
                    signal: controller.signal,
                    headers: { 'Content-Type': 'application/json' },
                },
            );

            if (
                sec?.data?.children.length > 0 &&
                Object.keys(map.data.nodes).length > 0
            ) {
                setMarket({
                    sec: sec?.data,
                    map: map?.data?.nodes,
                    sparklines: sparklines.data,
                });
            }
        };

        let ftLines = async () => {
            let sparklines = await axios.get(
                'http://localhost:3000/sparklines',
                {
                    signal: controller.signal,
                    headers: { 'Content-Type': 'application/json' },
                },
            );

            if (ref.current !== null) {
                drawLineChart(sparklines.data['AESE'], ref.current);
            }
        };
        // ftLines();
        fetchData();

        return () => controller.abort();
    }, []);

    // draw table
    useEffect(() => {
        if (ref.current && Object.keys(market).length > 0) {
            drawMarket(ref.current, market);
        }
    }, [market, ref.current]);

    return <div ref={ref} className='market_map'></div>;
};
