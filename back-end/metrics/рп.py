from collections import defaultdict
from datetime import datetime, timedelta

def parse_sessions(file_path: str):
    """
    Читает файл, возвращает список кортежей (дата_сессии, успешна_ли)
    Успешна, если количество просмотров >=2 секунд больше 2 (т.е. >=3)
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    sessions_raw = content.strip().split(';')
    sessions_data = []  # (date_str, is_successful)

    for sess in sessions_raw:
        sess = sess.strip()
        if not sess:
            continue
        parts = sess.split()
        if len(parts) < 2:
            continue  # нет данных о просмотрах

        # первая часть - временная метка (например, 2026-05-03T16:39:09.617Z)
        timestamp = parts[0]
        date_str = timestamp[:10]  # YYYY-MM-DD

        # все остальные части - длительности в миллисекундах
        durations = list(map(int, parts[1:]))
        # считаем, сколько просмотров было >=2 секунд
        good_views = sum(1 for d in durations if d >= 2000)
        is_success = good_views > 2  # больше порога в 2 (то есть >=3)

        sessions_data.append((date_str, is_success))

    return sessions_data

def compute_daily_stats(sessions_data):
    """Группирует по дате и считает долю успешных сессий (в процентах)."""
    total_by_day = defaultdict(int)
    success_by_day = defaultdict(int)

    for date_str, success in sessions_data:
        total_by_day[date_str] += 1
        if success:
            success_by_day[date_str] += 1

    # Получаем все даты с 2026-05-03 по 2026-05-09 включительно
    start_date = datetime(2026, 5, 3)
    end_date = datetime(2026, 5, 9)
    all_dates = []
    for i in range((end_date - start_date).days + 1):
        d = start_date + timedelta(days=i)
        all_dates.append(d.strftime('%Y-%m-%d'))

    stats = {}
    for date_str in all_dates:
        total = total_by_day.get(date_str, 0)
        success = success_by_day.get(date_str, 0)
        rate = (success / total * 100) if total > 0 else 0.0
        stats[date_str] = rate

    return stats, total_by_day, success_by_day

def main():
    sessions = parse_sessions('output.txt')
    daily_stats, total_by_day, success_by_day = compute_daily_stats(sessions)

    # Вывод по дням
    for date, rate in daily_stats.items():
        print(f"{date} {rate:.2f}%")

    # Итог за все время
    total_all = sum(total_by_day.values())
    success_all = sum(success_by_day.values())
    overall_rate = (success_all / total_all * 100) if total_all > 0 else 0.0
    print(f"\nВсего за период: {overall_rate:.2f}%")

if __name__ == "__main__":
    main()