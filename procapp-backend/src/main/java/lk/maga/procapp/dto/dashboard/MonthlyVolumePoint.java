package lk.maga.procapp.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor 
public class MonthlyVolumePoint {
    private String month;
    private long count;
    
}
