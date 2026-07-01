const ctx = document.getElementById('pop-chart').getContext('2d');
const popChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'White',
                data: [],
                borderColor: '#6B7BA4',
                backgroundColor: 'rgba(107,123,164,0.12)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#6B7BA4',
                tension: 0.35,
                fill: true,
            },
            {
                label: 'Brown',
                data: [],
                borderColor: '#E8633F',
                backgroundColor: 'rgba(232,99,63,0.1)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#E8633F',
                tension: 0.35,
                fill: true,
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        plugins: {
            legend: {
                position: 'top', align: 'end',
                labels: {
                    boxWidth: 14, boxHeight: 2, padding: 8,
                    font: { family: 'Space Grotesk', size: 11 },
                    color: '#3D5280',
                }
            },
            tooltip: {
                backgroundColor: '#0F1E3C',
                titleFont: { family: 'Space Grotesk', size: 11 },
                bodyFont:  { family: 'Space Grotesk', size: 11 },
                padding: 8, cornerRadius: 6,
                borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
            }
        },
        scales: {
            x: {
                grid:  { color: 'rgba(15,30,60,0.07)' },
                ticks: { font: { family: 'Space Grotesk', size: 10 }, color: '#8A9FC0' },
                title: { display: true, text: 'Generation', font: { family: 'Space Grotesk', size: 10 }, color: '#8A9FC0' }
            },
            y: {
                min: 0,
                max: 100,
                grid:  { color: 'rgba(15,30,60,0.07)' },
                ticks: { font: { family: 'Space Grotesk', size: 10 }, color: '#8A9FC0', callback: v => v + '%' },
            }
        }
    }
});

export function addGenData(gen, white, brown) {
    const total = white + brown;
    const wPct  = total > 0 ? Math.round(white / total * 100) : 0;
    const bPct  = total > 0 ? Math.round(brown / total * 100) : 0;
    popChart.data.labels.push(gen);
    popChart.data.datasets[0].data.push(wPct);
    popChart.data.datasets[1].data.push(bPct);
    popChart.update();
}

export function resetChart() {
    popChart.data.labels = [];
    popChart.data.datasets[0].data = [];
    popChart.data.datasets[1].data = [];
    popChart.update('none');
}
