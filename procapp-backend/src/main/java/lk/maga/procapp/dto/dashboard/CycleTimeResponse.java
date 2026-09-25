package lk.maga.procapp.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CycleTimeResponse {
    private Double currentMonthAverageDays;
    private Double previousMonthAverageDays;
    private double averageDays;
    
}
